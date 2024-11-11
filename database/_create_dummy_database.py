import csv

from datetime import datetime
from urllib.parse import urlparse

from models import Ad, Advertiser, database, create_tables

def main():
    try:

        print("Creating brand new database")
        database.drop_tables([Ad, Advertiser])
        create_tables()

        # Path to the CSV file
        csv_file_path = 'sample.csv'

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

if __name__ == "__main__":
    main()
