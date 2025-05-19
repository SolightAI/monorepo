"""
Common DTOs for jobs.

These types MUST be synchronized with the API types.
"""

from enum import Enum
from typing import Any, List
from pydantic import BaseModel, Field


class Product(BaseModel):
    """Product model

    Attributes:
        url (str): url of the product
        name (str): name of the product
        description (str): description of the product
        documentation (str): documentation of the product
        links_to_documentation (list[str]): links to documentation of the product
    """

    url: str
    name: str
    description: str
    documentation: str
    links_to_documentation: list[str]


class Epic(BaseModel):
    """Epic model

    Attributes:
        name (str): name of the epic
        description (str): description of the epic
    """

    name: str
    description: str


class Feature(BaseModel):
    """Feature model

    Attributes:
        id (str | None): Added id field for reference
        urls (list[str]): where the feature is implemented
        name (str): name of the feature
        description (str): description of the feature
        access_conditions (dict[str, Any] | None): conditions to access the feature
        dependents (List[Feature]): features depending on this feature
        dependencies (List[Feature]): features this feature depends on
    """

    id: str | None = None
    urls: list[str]
    name: str
    description: str
    access_conditions: dict[str, Any] | None = None

    dependents: List["Feature"] = Field(default_factory=list)
    dependencies: List["Feature"] = Field(default_factory=list)


class TestCategory(str, Enum):
    """Test category enum

    Attributes:
        UNIT (str): testing basic functionalities of a feature
        SMOKE (str): testing basic functionalities of a feature
        NEGATIVE (str): testing a negative path of a feature
    """
    
    # Tell pytest to ignore this class when running tests.
    __test__ = False

    UNIT = "UNIT"
    SMOKE = "SMOKE"
    NEGATIVE = "NEGATIVE"
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


class TestStatus(Enum):
    """Test status enum"""

    # Tell pytest to ignore this class when running tests.
    __test__ = False
    
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    AGENT_LIMITATION = "agent_limitation"
    NOT_FOUND = "not_found"
    BLOCKED_BY_CAPTCHA = "blocked_by_captcha"
    UNKNOWN = "unknown"


class Test(BaseModel):
    """Test model

    Attributes:
        name (str): name of the test
        description (str): description of the test
        url (str): where to start the test
        category (TestCategory): category of the test
        preconditions (str): preconditions for the test
        steps (str): steps for the test
        assertions (str): assertions for the test
        feature_id (str): id of the feature the test belongs to (changed from acceptance_criteria_id to feature_id)
        access_conditions (dict[str, Any] | None): conditions to access the feature
    """
    
    # Tell pytest to ignore this class when running tests.
    __test__ = False

    name: str
    description: str
    url: str
    category: TestCategory
    preconditions: str
    steps: str
    assertions: str
    feature_id: str
    access_conditions: dict[str, Any] | None = None
