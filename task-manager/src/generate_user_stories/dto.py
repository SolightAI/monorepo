from enum import Enum
from pydantic import BaseModel, Field
from typing import List


class Product(BaseModel):
    url: str
    name: str
    description: str
    documentation: str
    links_to_documentation: list[str]


class Epic(BaseModel):
    name: str
    description: str


class Feature(BaseModel):
    id: str  # Added id field to use for linking tests
    urls: list[str]  # where the feature is implemented
    name: str
    description: str

    dependents: List["Feature"] = Field(default_factory=list)  # features depending on this feature
    dependencies: List["Feature"] = Field(default_factory=list)  # features this feature depends on


class UserStory(BaseModel):
    name: str
