from __future__ import annotations
from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime
from enum import Enum


class UserPrivate(BaseModel):
    id: int
    username: str


class User(UserPrivate):
    email: str
    created_at: datetime

    def to_user_private(self) -> UserPrivate:
        user_dict = self.model_dump(exclude={"email", "created_at"})
        return UserPrivate(**user_dict)


class TokenData(BaseModel):
    username: str | None = None


class TestStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    PENDING = "PENDING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"
    SKIPPED = "SKIPPED"


class SeverityLevel(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class TestCategory(str, Enum):
    SMOKE = "SMOKE"
    FUNCTIONAL = "FUNCTIONAL"
    END_TO_END = "END_TO_END"
    UNIT = "UNIT"
    REGRESSION = "REGRESSION"
    INTEGRATION = "INTEGRATION"
    PERFORMANCE = "PERFORMANCE"
    USABILITY = "USABILITY"
    COMPATIBILITY = "COMPATIBILITY"
    LOCALIZATION = "LOCALIZATION"


class ProductBase(BaseModel):
    url: str
    name: str
    description: str
    documentation: str


class ProductCreate(ProductBase):
    pass


class Product(ProductBase):
    id: UUID4
    epics: list[EpicBase] = []

    class Config:
        from_attributes = True


class EpicBase(BaseModel):
    name: str
    description: str


class EpicCreate(EpicBase):
    product_id: UUID4


class Epic(EpicBase):
    id: UUID4
    product_id: UUID4
    features: list["Feature"] = []

    class Config:
        from_attributes = True


class FeatureBase(BaseModel):
    name: str
    urls: list[str]
    description: str


class FeatureCreate(FeatureBase):
    epic_id: UUID4


class Feature(FeatureBase):
    id: UUID4
    epic_id: UUID4
    user_stories: list[UserStoryBase] = []

    class Config:
        from_attributes = True


class UserStoryBase(BaseModel):
    title: str
    description: str


class UserStoryCreate(UserStoryBase):
    feature_id: UUID4


class UserStory(UserStoryBase):
    id: UUID4
    feature_id: UUID4
    acceptance_criteria: list[AcceptanceCriteriaBase] = []


class AcceptanceCriteriaBase(BaseModel):
    title: str
    description: str


class AcceptanceCriteriaCreate(AcceptanceCriteriaBase):
    user_story_id: UUID4


class AcceptanceCriteria(AcceptanceCriteriaBase):
    id: UUID4
    user_story_id: UUID4
    tests: list[TestBase] = []

    class Config:
        from_attributes = True


class TestBase(BaseModel):
    name: str
    description: str
    url: str
    category: TestCategory


class TestCreate(TestBase):
    acceptance_criteria_id: UUID4


class Test(TestBase):
    id: UUID4
    status: TestStatus
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    acceptance_criteria_id: UUID4
    bugs: list[BugBase] = []

    class Config:
        from_attributes = True


class BugBase(BaseModel):
    title: str
    description: str
    severity: SeverityLevel
    screenshots: list[str]
    url: str
    status: Optional[str]
    detected_at: datetime


class BugCreate(BugBase):
    test_id: UUID4


class Bug(BugBase):
    id: UUID4
    test_id: UUID4

    class Config:
        from_attributes = True
