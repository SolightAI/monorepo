import asyncio

from fastapi import FastAPI
from modules.output_modification.main import generate_modified_output
from modules.bidding.main import generate_bid
from modules.prediction.main import generate_prediction
from modules.auction.main import generate_auction, AuctionCandidate
from modules.filtering.main import select_top_k_ads, router as filtering_router
from database.models import Ad
from database.main import router as database_router


app = FastAPI()
app.include_router(filtering_router, prefix="/filtering", tags=["filtering"])
app.include_router(database_router, prefix="/database", tags=["database"])


def __debug_print_ad(ad: dict):
    print(f"Ad by {ad['advertiser']['name']}:")
    print("Headline: ", ad["headline"])
    print("Description: ", ad["description"])


@app.post("/")
async def generate_ad(query: str, output: str, context: str | None = None):# -> AuctionCandidate:

    ads = Ad.select()
    relevant_ads = select_top_k_ads(query=query, output=output, candidates=ads, k=1, context=context) # debugging TODO: remove k=1
    candidates = []

    async def process_ad(_ad):
        modified_output = await generate_modified_output(query=query, output=output, ad=_ad, context=context)

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

    return generate_auction(candidates=candidates).asdict()


if __name__ == "__main__":

    selected_ad = asyncio.run(generate_ad(query="What is the weather in Tokyo?", output="The weather in Tokyo is sunny."))
    __debug_print_ad(selected_ad["ad"])
