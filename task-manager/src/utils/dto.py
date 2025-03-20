from enum import Enum
from pydantic import BaseModel, Field
from typing import List


class TestStatus(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"


class TestCategory(str, Enum):
    UNIT = "UNIT"  # very small tests, specific functions (unit tests)
    FUNCTIONAL = "FUNCTIONAL"  # testing a functionality of a feature
    SMOKE = "SMOKE"  # testing basic functionalities of a feature
    END_TO_END = "END_TO_END"  # multi-step tests, testing a feature as a whole
    REGRESSION = "REGRESSION"  # testing a feature after a bug has been fixed
    INTEGRATION = "INTEGRATION"  # testing the integration between features
    PERFORMANCE = "PERFORMANCE"  # testing the performance of a feature
    USABILITY = "USABILITY"  # testing the usability of a feature
    COMPATIBILITY = "COMPATIBILITY"  # testing the compatibility of a feature with different browsers, devices, etc.
    LOCALIZATION = "LOCALIZATION"  # testing the localization of a feature


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
    id: str | None = None  # Added id field for reference
    urls: list[str]  # where the feature is implemented
    name: str
    description: str

    dependents: List["Feature"] = Field(default_factory=list)  # features depending on this feature
    dependencies: List["Feature"] = Field(default_factory=list)  # features this feature depends on


class UserStory(BaseModel):
    name: str


class AcceptanceCriteria(BaseModel):
    name: str
    description: str


class Test(BaseModel):
    name: str
    description: str
    url: str  # where to start the test
    category: TestCategory
    preconditions: str
    steps: str
    expected_results: str
    assertions: str
    feature_id: str  # Changed from acceptance_criteria_id to feature_id
