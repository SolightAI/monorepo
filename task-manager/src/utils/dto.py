from enum import Enum
from pydantic import BaseModel, Field
from typing import List, Any


class PageType(str, Enum):
    MARKETING = "marketing"
    PRODUCT = "product"


class TestCategory(str, Enum):
    UNIT = "UNIT"  # testing basic functionalities of a feature
    SMOKE = "SMOKE"  # testing basic functionalities of a feature
    NEGATIVE = "NEGATIVE"  # testing a negative path of a feature
    # END_TO_END = "END_TO_END"  # multi-step tests, testing a feature as a whole (flow tests)
    # REGRESSION = "REGRESSION"  # testing a feature after a bug has been fixed
    # INTEGRATION = "INTEGRATION"  # testing the integration between features
    # PERFORMANCE = "PERFORMANCE"  # testing the performance of a feature
    # USABILITY = "USABILITY"  # testing the usability of a feature
    # COMPATIBILITY = "COMPATIBILITY"  # testing the compatibility of a feature with different browsers, devices, etc.
    # LOCALIZATION = "LOCALIZATION"  # testing the localization of a feature


TEST_CATEGORIES_DESCRIPTION = {
    TestCategory.UNIT: "aka (Unit tests): Testing specific, fine-grained parts of a feature.",
    TestCategory.SMOKE: "aka (Happy path): testing the functionality of a feature, making sure it works as expected.",
    TestCategory.NEGATIVE: "aka (Unhappy path): testing scenarios where the user is suppposed to encounter errors, making sure the feature behaves as expected with invalid data, inputs or actions.",
}


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
    access_conditions: dict[str, Any] | None = None  # conditions to access the feature

    dependents: List["Feature"] = Field(default_factory=list)  # features depending on this feature
    dependencies: List["Feature"] = Field(default_factory=list)  # features this feature depends on


class UserStory(BaseModel):
    name: str


class AcceptanceCriteria(BaseModel):
    name: str
    description: str


class TestStatus(Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    AGENT_LIMITATION = "agent_limitation"
    UNEXISTING_FEATURE = "unexisting_feature"
    BLOCKED_BY_CAPTCHA = "blocked_by_captcha"
    UNKNOWN = "unknown"


class Test(BaseModel):
    name: str
    description: str
    url: str  # where to start the test
    category: TestCategory
    preconditions: str
    steps: str
    assertions: str
    feature_id: str  # Changed from acceptance_criteria_id to feature_id
    access_conditions: dict[str, Any] | None = None  # conditions to access the feature

    # def toJSON(self):
    #     return {
    #         "name": self.name,
    #         "description": self.description,
    #         "url": self.url,
    #         "category": self.category,
    #         "preconditions": self.preconditions,
    #         "steps": self.steps,
    #         "assertions": self.assertions,
    #         "feature_id": self.feature_id,
    #         "access_conditions": self.access_conditions,
    #     }
