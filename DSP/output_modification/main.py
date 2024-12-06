from typing import Optional
from openai import AsyncOpenAI
from database.models import Ad


client = AsyncOpenAI()


async def generate_modified_output(query: str, output: str, ad: Ad, context: Optional[str] = None) -> str:
    """
    Generate the modified output based on the query, output, ad and optional context.

    Args:
        query (str): The user's original query
        output (str): The original output to be modified
        ad (str): The advertisement to be incorporated
        context (Optional[str]): Optional context information

    Returns:
        str: The modified output incorporating the ad naturally
    """

    system_prompt = """You are an expert at naturally incorporating advertisements into text responses.
    Modify the given output to seamlessly include the ad while maintaining relevance and natural flow."""

    # Build the user message with all components
    user_message = f"""Original Query: {query}
Original Output: {output}
Advertisement headline: {ad.headline}
Advertisement description: {ad.description}
"""

    # Add context if provided
    if context:
        user_message += f"Additional Context: {context}\n"

    try:

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0
        )

        # Extract and return the modified output
        modified_output = response.choices[0].message.content.strip()

        return modified_output

    except Exception as e:
        # In case of any errors, return the original output
        print(f"Error in output modification: {str(e)}")
        return output


if __name__ == "__main__":
    dummy_query = "What is the weather in Tokyo?"
    dummy_output = "The weather in Tokyo is sunny."
    dummy_ad = "See the world in style with Meller - elevate your look and protect your eyes with our premium sunglasses!"
    dummy_context = "USER: What is the weather in Paris?\nASSISTANT: The weather in Paris is cloudy."

    print(generate_modified_output(dummy_query, dummy_output, dummy_ad, dummy_context))
