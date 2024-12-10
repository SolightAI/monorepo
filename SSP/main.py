import os
import requests
import uuid
import httpx
import uvicorn

from datetime import datetime
from pydantic import BaseModel
from enum import Enum
from fastapi import FastAPI
from dataclasses import dataclass, asdict
from typing import Any
from fastapi.middleware.cors import CORSMiddleware


DSP_URL = os.getenv("DSP_URL")

if not DSP_URL:
    raise Exception("DSP_URL environment variable is not set")

app = FastAPI()

# Add after creating the FastAPI app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class PromptContext:
    query: str
    output: str


@dataclass
class PublisherAudienceSex:
    male: float
    female: float


@dataclass
class PublisherAudienceAge:
    under_18: float
    between_18_and_25: float
    between_25_and_35: float
    between_35_and_50: float
    above_50: float


class CountryCodes_ISO_3166_1_Alpha_2(str, Enum):
    FR = "FR"
    US = "US"
    GB = "GB"
    DE = "DE"
    ES = "ES"
    IT = "IT"
    NL = "NL"


@dataclass
class PublisherAudience:
    sex: PublisherAudienceSex
    age: PublisherAudienceAge
    demographics: list[CountryCodes_ISO_3166_1_Alpha_2]


@dataclass
class TargetedUserInfo:
    age: int
    gender: str
    country: CountryCodes_ISO_3166_1_Alpha_2


@dataclass
class PublisherInfo:
    name: str
    # audience: PublisherAudience
    user_info: TargetedUserInfo


@dataclass
class AdRequest:
    query: str
    output: str
    context: list[PromptContext] | None = None
    publisher_info: PublisherInfo | None = None


@dataclass
class Ad:
    id: str
    content: str
    bid: float


def enum_to_str(obj: Any) -> Any:
    if isinstance(obj, Enum):
        return obj.value
    return obj


# TODO: Implement the auction
def conduct_auction(ads: list[Ad]) -> Ad:
    import random

    # weighted random choice
    total_bid = sum(ad["bid"] for ad in ads)
    weighted_ads = [(ad, ad["bid"] / total_bid) for ad in ads]
    winner_ad = random.choices(
        population=[ad for ad, _ in weighted_ads],
        weights=[weight for _, weight in weighted_ads],
        k=1
    )[0]

    return winner_ad



@app.post("/query")
async def forward_ad_request_to_dsp(
    ad_request: AdRequest,
):

    request_id = str(uuid.uuid4())

    ad_request_dict = {
        k: enum_to_str(v) if isinstance(v, (Enum, list)) else v
        for k, v in asdict(ad_request).items()
    }
    ad_request_dict["id"] = request_id
    response = requests.post(DSP_URL + "/ad", json=ad_request_dict)

    if response.status_code != 200:
        raise Exception(f"Failed to forward ad request to DSP: {response.status_code} {response.text}")

    ads: list[Ad] = response.json()

    if len(ads) == 0:
        return None

    winner_ad = conduct_auction(ads)

    # # Inform the DSP which ad has been served
    # NOTE: we don't need to inform the DSP which ad has been served
    # because the publisher will inform us when it serves the ad
    # async with httpx.AsyncClient() as client:
    #     await client.post(DSP_URL + "ad/winner", json=winner_ad | {"id": winner_ad["id"]})

    return winner_ad


class TrackImpressionRequest(BaseModel):
    campaign_id: int
    event_time: datetime
    event_type: str
    user_id: str
    publisher_id: str
    ip_address: str
    user_agent: str
    geo_country: str
    cost_usd: float


@app.post("/ad/track-impression")
async def track_impression(
    track_impression_request: TrackImpressionRequest,
):
    requests.post(DSP_URL + "/campaign/track-impression", params=track_impression_request.model_dump())


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)



# 1) Reçois une requête avec
#   * query: la requête de l'utilisateur
#   * output: la réponse de l'assistant
#   * context: les queries et outputs précédents
#   * publisher's info: nom, audience

# 2) Forwards les infos au DSP

# 3) DSP retourne une liste d'ads avec bids associés

# 4) Fait l'auction

# 5) Retourne l'ad gagnante au publisher

# 6) Informe le DSP quel ad a été servie


# == Coté DSP ==
# 1) Reçois une requête avec
#   * query
#   * output
#   * context
#   * publisher's info

# 2) Filtre les advertisers selon leur critères et infos reçues

# 3) Génère les bids pour chaque ad

# 4) Retourne les ads avec bids associés

# 5) Reçoit l'ad gagnante du SSP

# 6) Charge l'advertiser associé à l'ad gagnante
