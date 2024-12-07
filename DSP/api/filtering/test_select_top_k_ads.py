import pytest

from database.models import Ad
from modules.filtering.main import select_top_k_ads


@pytest.mark.parametrize("query, output, ads, expected_index", [
    (
        "I want to buy a laptop",
        "",
        [
            Ad(description="Shop Tommy for stylish comfort! Men's hoodies, tees & more with logo. Up to 30% off."),
            Ad(description="Iconic Jordan style. Shop Max Aura 6 in classic colors for 129€. All sizes at Zalando."),
            Ad(description="14\" laptop: i5, 16GB RAM, 512GB SSD, Win 11. Portable power for work, school & play."), # Expected top ad
            Ad(description="Find your perfect fit with 2000+ brands at Zalando. Shop online and enjoy free returns."),
            Ad(description="Ralph Lauren men's shirt in Tuscan Beige Heather. Free shipping & returns at Zalando.fr."),
            Ad(description="Fast, high-quality WiFi printer with 435 4+ star reviews. Make an informed purchase now."),
            Ad(description="See the world in style with Meller - elevate your look and protect your eyes with our premium sunglasses!"),
        ],
        2,
    ),
    (
        "What is the weather in Tokyo?",
        "The weather in Tokyo is sunny.",
        [
            Ad(description="Shop Tommy for stylish comfort! Men's hoodies, tees & more with logo. Up to 30% off."),
            Ad(description="Iconic Jordan style. Shop Max Aura 6 in classic colors for 129€. All sizes at Zalando."),
            Ad(description="14\" laptop: i5, 16GB RAM, 512GB SSD, Win 11. Portable power for work, school & play."),
            Ad(description="Find your perfect fit with 2000+ brands at Zalando. Shop online and enjoy free returns."),
            Ad(description="Ralph Lauren men's shirt in Tuscan Beige Heather. Free shipping & returns at Zalando.fr."),
            Ad(description="Fast, high-quality WiFi printer with 435 4+ star reviews. Make an informed purchase now."),
            Ad(description="See the world in style with Meller - elevate your look and protect your eyes with our premium sunglasses!"), # Expected top ad
        ],
        -1,
    ),
    (
        "I like printing stuff",
        "That's great! There's something satisfying about turning digital information into a physical form. What do you usually print, or are you looking for new ideas?",
        [
            Ad(description="Shop Tommy for stylish comfort! Men's hoodies, tees & more with logo. Up to 30% off."),
            Ad(description="Iconic Jordan style. Shop Max Aura 6 in classic colors for 129€. All sizes at Zalando."),
            Ad(description="14\" laptop: i5, 16GB RAM, 512GB SSD, Win 11. Portable power for work, school & play."),
            Ad(description="Find your perfect fit with 2000+ brands at Zalando. Shop online and enjoy free returns."),
            Ad(description="Ralph Lauren men's shirt in Tuscan Beige Heather. Free shipping & returns at Zalando.fr."),
            Ad(description="Fast, high-quality WiFi printer with 435 4+ star reviews. Make an informed purchase now."), # Expected top ad
            Ad(description="See the world in style with Meller - elevate your look and protect your eyes with our premium sunglasses!"),
        ],
        -2,
    )

])
def test_select_top_k_ads(query, output, ads, expected_index):
    top_ad = select_top_k_ads(query=query, output=output, candidates=ads, k=1, context="")[0]
    assert top_ad['ad'].description == ads[expected_index].description
