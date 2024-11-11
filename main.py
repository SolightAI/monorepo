import asyncio

from modules.output_modification.main import generate_modified_output
from modules.bidding.main import generate_bid
from modules.prediction.main import generate_prediction
from modules.auction.main import generate_auction, AuctionCandidate
from modules.filtering.main import select_top_k_ads
from database.models import Ad, Advertiser


def __debug_print_ad(ad: Ad):
    print(f"Ad by {ad.advertiser.name}:")
    print("Headline: ", ad.headline)
    print("Description: ", ad.description)


async def generate_ad(query: str, output: str, context: str | None = None) -> AuctionCandidate:

    ads = Ad.select()
    # relevant_ads = ads[:10]  # TODO: select most relevant ads
    relevant_ads = select_top_k_ads(query=query, output=output, candidates=ads, k=3, context=context)
    candidates = []

    async def process_ad(_ad):
        # __debug_print_ad(_ad)
        modified_output = await generate_modified_output(query=query, output=output, ad=_ad, context=context)
        # print(f"Modified Output: {modified_output}\n\n")

        bid = await generate_bid(query=query, output=output, modified_output=modified_output)
        sr, ctr = await generate_prediction(query=query, output=output, modified_output=modified_output, context=context)

        return AuctionCandidate(
            ad=_ad,
            modified_output=modified_output,
            bid=bid,
            satisfaction_rate=sr,
            click_through_rate=ctr
        )

    # Create tasks for all ads
    tasks = [process_ad(ad['ad']) for ad in relevant_ads]

    # Wait for all tasks to complete
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Filter out any failed results
    candidates = [result for result in results if isinstance(result, AuctionCandidate)]

    return generate_auction(candidates=candidates)


if __name__ == "__main__":

    selected_ad = asyncio.run(generate_ad(query="What is the weather in Tokyo?", output="The weather in Tokyo is sunny."))
    print(selected_ad)
    __debug_print_ad(selected_ad.ad)
    # print("URL: ", selected_ad.ad.url)

    # dummy_query = "What is the weather in Tokyo?"
    # dummy_output = "The weather in Tokyo is sunny."

    # dummy_ad_1 = "See the world in style with Meller - elevate your look and protect your eyes with our premium sunglasses!"
    # dummy_modified_1 = generate_modified_output(dummy_query, dummy_output, dummy_ad_1)
    # dummy_bid_1 = generate_bid(dummy_query, dummy_output, dummy_modified_1)
    # dummy_sr_1, dummy_ctr_1 = generate_prediction(dummy_query, dummy_output, dummy_modified_1)

    # dummy_ad_2 = "Power meets precision - unleash your potential with the all-new MacBook Pro."
    # dummy_modified_2 = generate_modified_output(dummy_query, dummy_output, dummy_ad_2)
    # dummy_bid_2 = generate_bid(dummy_query, dummy_output, dummy_modified_2)
    # dummy_sr_2, dummy_ctr_2 = generate_prediction(dummy_query, dummy_output, dummy_modified_2)

    # dummy_modified_bad = "The weather in Tokyo is sunny. BUY NIKE SHOES NOW FOR 50% OFF! BEST DEALS ON RUNNING SHOES! CLICK HERE! The weather is great for running!"
    # dummy_bid_bad = generate_bid(dummy_query, dummy_output, dummy_modified_bad)
    # dummy_sr_bad, dummy_ctr_bad = generate_prediction(dummy_query, dummy_output, dummy_modified_bad)

    # dummy_candidates = [
    #     AuctionCandidate(ad=dummy_ad_1, modified_output=dummy_modified_1, bid=dummy_bid_1, satisfaction_rate=dummy_sr_1, click_through_rate=dummy_ctr_1),
    #     AuctionCandidate(ad=dummy_ad_2, modified_output=dummy_modified_2, bid=dummy_bid_2, satisfaction_rate=dummy_sr_2, click_through_rate=dummy_ctr_2),
    #     AuctionCandidate(ad={}, modified_output=dummy_modified_bad, bid=dummy_bid_bad, satisfaction_rate=dummy_sr_bad, click_through_rate=dummy_ctr_bad),
    # ]

    # print(generate_auction(dummy_candidates))
