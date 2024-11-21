import io
import re
import csv
import openai
import aiohttp
import asyncio
import pandas as pd
from datetime import datetime

from urllib.parse import urlparse
from tqdm.asyncio import tqdm_asyncio
from database.models import Ad, Advertiser, database, create_tables


client = openai.AsyncOpenAI()


def convert_csv_to_database():
    try:

        print("Creating brand new database")
        database.drop_tables([Ad, Advertiser])
        create_tables()

        # Path to the CSV file
        csv_file_path = 'fake_ads.csv'

        # Read CSV and insert data into the database
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)

            with database.atomic():  # Use a transaction for efficient bulk insertions
                for row in reader:

                    # Extract domain name from URL more reliably using urlparse
                    domain = urlparse(row['Target Url']).netloc

                    # Create or get advertiser
                    advertiser, created = Advertiser.get_or_create(
                        name=domain,
                        created_at=datetime.now(),
                    )

                    # Create ad with foreign key reference
                    Ad.create(
                        advertiser=advertiser,
                        headline=row['Ad Headline 1'],
                        description=row['Ad Description 1'],
                        url=row['Target Url'],
                        created_at=datetime.now(),
                    )

        print("Number of ads inserted:", Ad.select().count())

    except FileNotFoundError:
        print(f"Error: Could not find file {csv_file_path}")

    except Exception as e:
        print(f"An error occurred: {str(e)}")

    finally:
        database.close()


async def fetch_webpage_content(session, url):
    """Fetches the content of the web page at the given URL asynchronously."""
    async with session.get(url, timeout=60) as response:

        if response.status != 200:
            response.raise_for_status()

        return await response.text()


def remove_svgs(text):
    return re.sub(r'<svg[^>]*>.*?</svg>', '', text, flags=re.DOTALL)


async def generate_ad_for_item(html_content):

    prompt = """Generate a fake ad for each item on the following web page.

Write the result as a CSV with the following columns:Target Url,Ad Description 1,Ad Description 2,Ad Headline 1,Ad Headline 2
Example of a CSV row:
https://www.zalando.fr/tommy-hilfiger-logo-hoody-sweatshirt-to122s06q-q11.html,"Shop Tommy for stylish comfort! Men's hoodies, tees & more with logo. Up to 30% off.","Tommy's hoodies, tees & sweats you crave. Stylish comfort from a trusted name.","Hilfiger: Iconic Style, Deals","Tommy: Logo Wear, 30% Off"

Don't write any other text than the CSV header and the CSV rows, nothing else.
Make sure to write the ad in English.
"""

    prompt += html_content

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": ""}
        ],
        temperature=0,
        timeout=60
    )

    # Convert the CSV string to a pandas DataFrame
    csv_string = response.choices[0].message.content.strip()
    return pd.read_csv(io.StringIO(csv_string))


async def main():

    urls = [
        "https://www.dealabs.com/", # dealabs (coupons)
        "https://www.rueducommerce.fr/ventes-flash/+fcat-70004+fdi-1.html?sort=4", # household appliances

        # cdiscount
        "https://www.cdiscount.com/juniors/jeux-et-jouets-par-type/v-12006-12006.html", # toys
        "https://www.cdiscount.com/informatique/v-107-0.html", # computers
        "https://www.cdiscount.com/electromenager/v-110-0.html", # household appliances
        "https://www.cdiscount.com/maison/v-117-0.html", # homeware
        "https://www.cdiscount.com/le-sport/v-121-0.html", # sport
        "https://www.cdiscount.com/bricolage/v-166-0.html", # DIY
        "https://www.cdiscount.com/high-tech/v-106-0.html", # tech
        "https://www.cdiscount.com/auto/v-133-0.html", # automotive

        # clothing
        "https://www.zalando.fr/chaussures-homme/", # men's shoes
        "https://www.zalando.fr/sacs-accessoires-homme/", # men's accessories
        "https://www.zalando.fr/bijoux-luxe-homme/", # men's luxury jewelry
        "https://www.zalando.fr/sport-homme/", # sportswear
        "https://www.zalando.fr/beaute-homme-soins/", # men's skincare
        "https://www.zalando.fr/streetwear-homme/", # men's streetwear

        # miscellaneous
        "https://mellerbrand.com/collections/sunglasses", # sunglasses
        "https://www.laboratoires-biarritz.com/en/68-suncare", # suncare
    ]

    urls = ["https://r.jina.ai/" + url for url in urls]

    # Create an aiohttp session for all requests
    async with aiohttp.ClientSession() as session:
        # Fetch all HTML content concurrently
        print("Fetching HTML content...")
        html_contents = {}
        async def fetch_and_process(url):
            try:
                html_content = await fetch_webpage_content(session, url)
                html_content = remove_svgs(html_content)
                html_contents[url] = html_content
            except aiohttp.ClientError as e:
                print(f"Error fetching webpage content of {url} - {e}")
            except Exception as e:
                print(f"An error occurred on {url} - {e}")

        # Use tqdm_asyncio to show progress
        await tqdm_asyncio.gather(*[
            fetch_and_process(url) for url in urls
        ])

        # Then process all content with OpenAI
        outputs = {}
        print("\nGenerating ads...")
        tasks = []
        for url, html_content in html_contents.items():
            tasks.append(generate_ad_for_item(html_content))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for url, result in zip(html_contents.keys(), results):
            if isinstance(result, Exception):
                print(f"An error occurred processing {url} - {result}")
            else:
                outputs[url] = result
                print(f"Retrieved {len(result)} rows from {url}")

        # Combine all DataFrames
        if outputs:

            final_df = pd.concat(outputs.values(), ignore_index=True)

            for row in final_df.iterrows():
                print(row)


            print(final_df)
            print("Rows:", len(final_df))

            final_df.to_csv('fake_ads.csv', index=False)

    convert_csv_to_database()


if __name__ == "__main__":
    asyncio.run(main())
