import os
import requests
import uuid
import httpx
import uvicorn

from enum import Enum
from fastapi import FastAPI
from dataclasses import dataclass


app = FastAPI()


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


class CountryCodes_ISO_3166_1_Alpha_2(Enum):
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
    # audience: PublisherAudience # Ignored for now
    user_info: TargetedUserInfo


@dataclass
class AdRequest:
    id: str
    query: str
    output: str
    context: list[PromptContext] | None = None
    publisher_info: PublisherInfo | None = None


@dataclass
class Ad:
    id: str
    content: str
    bid: float | None = None
    num_clicks: int = 0
    num_impressions: int = 0


@dataclass
class AudienceSexFilter:
    male: bool
    female: bool


# NOTE: we could use float for the max-bid instead of bool
# for false we could use a bid of 0.0
@dataclass
class AudienceAgeFilter:
    under_18: bool
    between_18_and_25: bool
    between_25_and_35: bool
    between_35_and_50: bool
    above_50: bool


@dataclass
class AudienceFilters:
    sex: AudienceSexFilter
    age: AudienceAgeFilter
    demographics: dict[CountryCodes_ISO_3166_1_Alpha_2, bool]


@dataclass
class AdCampaign:
    id: str
    filters: AudienceFilters
    ads: list[Ad]


import random
from faker import Faker

fake = Faker()

fake_campaigns = [
    AdCampaign(
        id=str(uuid.uuid4()),
        filters=AudienceFilters(
            sex=AudienceSexFilter(
                male=random.choice([True, False]),
                female=random.choice([True, False]),
            ),
            age=AudienceAgeFilter(
                under_18=random.choice([True, False]),
                between_18_and_25=random.choice([True, False]),
                between_25_and_35=random.choice([True, False]),
                between_35_and_50=random.choice([True, False]),
                above_50=random.choice([True, False]),
            ),
            demographics={iso_code: random.choice([True, False]) for iso_code in CountryCodes_ISO_3166_1_Alpha_2},
        ),
        ads=[Ad(id=str(uuid.uuid4()), content=fake.sentence()) for _ in range(2)],
    ) for _ in range(1_000)
]


def filter_campaigns(ad_request: AdRequest) -> list[AdCampaign]:

    def _keep_campaign(campaign: AdCampaign) -> bool:

        # Gender
        if ad_request.publisher_info.user_info.gender == "male" and campaign.filters.sex.male != True:
            return False
        if ad_request.publisher_info.user_info.gender == "female" and campaign.filters.sex.female != True:
            return False

        # Age
        if ad_request.publisher_info.user_info.age < 18 and campaign.filters.age.under_18 != True:
            return False
        if ad_request.publisher_info.user_info.age in range(18, 26) and campaign.filters.age.between_18_and_25 != True:
            return False
        if ad_request.publisher_info.user_info.age in range(26, 35) and campaign.filters.age.between_25_and_35 != True:
            return False
        if ad_request.publisher_info.user_info.age in range(35, 50) and campaign.filters.age.between_35_and_50 != True:
            return False
        if ad_request.publisher_info.user_info.age >= 50 and campaign.filters.age.above_50 != True:
            return False

        # Demographics
        if ad_request.publisher_info.user_info.country not in campaign.filters.demographics or campaign.filters.demographics[ad_request.publisher_info.user_info.country] != True:
            return False

        return True

    # Filter campaigns
    return list(filter(
        _keep_campaign,
        fake_campaigns,
    ))


@app.post("/ad")
async def generate_ads(
    ad_request: AdRequest,
) -> list[Ad]:

    filtered_campaigns = filter_campaigns(ad_request)

    # TODO: Implement the bidding
    def generate_bids(ad_request: AdRequest, filtered_campaigns: list[AdCampaign]) -> list[Ad]:
        for campaign in filtered_campaigns:
            for ad in campaign.ads:
                ad.bid = random.uniform(0.1, 10.0)

        return filtered_campaigns

    bids = generate_bids(ad_request, filtered_campaigns)

    return [ad for campaign in bids for ad in campaign.ads] # flatten


# @app.post("/ad/winner")
# async def receive_winner_ad(
#     ad: Ad,
# ):
#     for campaign in fake_campaigns:
#         for _ad in campaign.ads:
#             if _ad.id == ad.id:
#                 _ad.num_impressions += 1


@app.post("/ad/track-impression")
async def track_impression(
    id: str,
):
    for campaign in fake_campaigns:
        for _ad in campaign.ads:
            if _ad.id == id:
                _ad.num_impressions += 1


@app.get("/ad/stats")
async def get_stats():
    return fake_campaigns


@app.get("/ad/stats/{id}")
async def get_stats_for_ad(
    id: str,
):
    for campaign in fake_campaigns:
        for _ad in campaign.ads:
            if _ad.id == id:
                return _ad


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)


# TODO: supporter différent formats


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
