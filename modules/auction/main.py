from dataclasses import dataclass
from database.models import Ad


@dataclass
class AuctionCandidate:
    ad: Ad

    modified_output: str
    bid: float
    satisfaction_rate: float
    click_through_rate: float


def dummy_objective_function(satisfaction_rate: float, click_through_rate: float, bid: float) -> float:
    """
    Dummy objective function for the auction.
    """
    return bid / 10 * satisfaction_rate * click_through_rate / 2


def generate_auction(candidates: list[AuctionCandidate]) -> AuctionCandidate:
    """
    Generate the auction based on the candidates.
    """

    # i.e., selecting i∗ = argmaxi∈[n] Obj(sri, ctri, bidi)
    # TODO: Read about objective functions

    return max(candidates, key=lambda x: dummy_objective_function(x.satisfaction_rate, x.click_through_rate, x.bid))


if __name__ == "__main__":
    dummy_candidates = [
        AuctionCandidate(modified_output="", bid=1, satisfaction_rate=0.5, click_through_rate=0.5),
        AuctionCandidate(modified_output="", bid=2, satisfaction_rate=0.6, click_through_rate=0.6),
    ]

    print(generate_auction(dummy_candidates))
