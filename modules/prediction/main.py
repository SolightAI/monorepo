from openai import AsyncOpenAI


client = AsyncOpenAI()


async def generate_prediction(query: str, output: str, modified_output: str, context: str | None = None) -> tuple[float, float]:
    """
    Generate the user satisfaction rate (SR) and click-through rate (CTR) based on the query, output, 
    modified output and optional context.

    Args:
        query (str): The user's original query
        output (str): The original output
        modified_output (str): The modified output containing the ad
        context (Optional[str]): Optional context information

    Returns:
        tuple[float, float]: A tuple containing (satisfaction_rate, click_through_rate),
                            both values between 0 and 1
    """
    system_prompt = """You are an expert at predicting user satisfaction and click-through rates for modified outputs in an advertising context.
    Analyze the original query, output, and modified output to predict:
    1. User Satisfaction Rate (SR): How satisfied the user will be with the modified response (0-1)
    2. Click-Through Rate (CTR): How likely the user is to engage with the ad (0-1)

    Return only two numbers separated by a comma (SR,CTR). For example: 0.85,0.32

    Consider factors like:
    - How well the modified output answers the original query
    - How naturally the ad is incorporated
    - How relevant the ad is to the user's interests
    - How likely the user is to be annoyed by the ad
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

        # Extract the prediction values from the response
        prediction_text = response.choices[0].message.content.strip()

        try:
            sr, ctr = map(float, prediction_text.split(','))
            # Ensure values are within valid range
            sr = max(0.0, min(1.0, sr))
            ctr = max(0.0, min(1.0, ctr))
            return sr, ctr
        except ValueError:
            # If we can't parse the response correctly, return default values
            print("Error parsing prediction values, returning defaults")
            return 0.5, 0.5

    except Exception as e:
        # In case of any errors, return default values
        print(f"Error in prediction generation: {str(e)}")
        return 0.5, 0.5


if __name__ == "__main__":
    # Test the function with dummy data
    dummy_query = "What is the weather in Tokyo?"
    dummy_output = "The weather in Tokyo is sunny."

    dummy_modified_1 = "The weather in Tokyo is sunny. Speaking of sunny weather, protect your eyes with Meller's premium sunglasses!"
    dummy_modified_2 = "The weather in Tokyo is sunny. BUY NIKE SHOES NOW FOR 50% OFF! BEST DEALS ON RUNNING SHOES! CLICK HERE! The weather is great for running!"

    sr, ctr = generate_prediction(dummy_query, dummy_output, dummy_modified_1)
    print(f"1) Satisfaction Rate: {sr:.2f}")
    print(f"1) Click-Through Rate: {ctr:.2f}")

    sr, ctr = generate_prediction(dummy_query, dummy_output, dummy_modified_2)
    print(f"2) Satisfaction Rate: {sr:.2f}")
    print(f"2) Click-Through Rate: {ctr:.2f}")
