from typing import Optional
from openai import AsyncOpenAI


client = AsyncOpenAI()


async def generate_bid(query: str, output: str, modified_output: str, context: Optional[str] = None) -> float:
    """
    Generate the bid based on the query, output, modified output and optional context.

    Args:
        query (str): The user's original query
        output (str): The original output
        modified_output (str): The modified output containing the ad
        context (Optional[str]): Optional context information

    Returns:
        float: The generated bid value between 0 and 10
    """

    system_prompt = """You are an expert at determining the optimal bid value for modified outputs in an advertising context.
    Analyze the original query, output, and modified output to determine how well the ad is incorporated.
    Return only a single float number between 0 and 10, where:
    - 0 means the modification is poor and not worth bidding
    - 10 means the modification is perfect and worth maximum bid
    Consider factors like:
    - How relevant the modification is to the query (super important, the most relevant, the highest bid)
    - How well the modified output maintains the original meaning
    - How naturally the ad is incorporated
    """

    user_message = f"""Original Query: {query}
Original Output: {output}
Modified Output: {modified_output}
"""

    if context:
        user_message += f"Context: {context}\n"

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0  # Lower temperature for more consistent numerical outputs
        )

        # Extract the bid value from the response
        bid_text = response.choices[0].message.content.strip()
        try:
            bid = float(bid_text)
            # Ensure the bid is within the valid range
            bid = max(0.0, min(10.0, bid))
            return bid
        except ValueError:
            # If we can't parse the response as a float, return a default value
            print("Error parsing bid value, returning default")
            return 5.0

    except Exception as e:
        # In case of any errors, return a default bid
        print(f"Error in bid generation: {str(e)}")
        return 5.0


if __name__ == "__main__":
    # Test the function with dummy data
    dummy_query = "What is the weather in Tokyo?"
    dummy_output = "The weather in Tokyo is sunny."

    dummy_modified_1 = "The weather in Tokyo is sunny. Speaking of sunny weather, protect your eyes with Meller's premium sunglasses!"
    dummy_modified_2 = "The weather in Tokyo is sunny. BUY NIKE SHOES NOW FOR 50% OFF! BEST DEALS ON RUNNING SHOES! CLICK HERE! The weather is great for running!"

    bid_1 = generate_bid(dummy_query, dummy_output, dummy_modified_1)
    print(f"Generated bid N°1: {bid_1}")

    bid_2 = generate_bid(dummy_query, dummy_output, dummy_modified_2)
    print(f"Generated bid N°2: {bid_2}")
