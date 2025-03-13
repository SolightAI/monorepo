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
    is_admin: bool = False

    def to_user_private(self) -> UserPrivate:
        user_dict = self.model_dump(exclude={"email", "created_at", "is_admin"})
        return UserPrivate(**user_dict)


class InvitationBase(BaseModel):
    email: Optional[str] = None
    expires_at: Optional[datetime] = None


class InvitationCreate(InvitationBase):
    pass


class Invitation(InvitationBase):
    id: UUID4
    code: str
    created_at: datetime
    created_by_id: Optional[int] = None
    used: bool
    used_at: Optional[datetime] = None
    used_by_id: Optional[int] = None

    class Config:
        from_attributes = True


class UserRegister(BaseModel):
    username: str
    email: str
    invitation_code: str


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


class LinkDocument(BaseModel):
    title: str
    url: str


class ProductBase(BaseModel):
    url: str
    name: str
    description: str
    documentation: str
    links_to_documentation: list[LinkDocument] = []


class ProductCreate(ProductBase):
    pass


class Product(ProductBase):
    id: UUID4
    epics: list[EpicBase] = []

    class Config:
        from_attributes = True


class EpicCreate(BaseModel):
    name: str
    description: str
    product_id: UUID4


class EpicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class EpicBase(EpicCreate):
    id: UUID4


class Epic(EpicBase):
    features: list["FeatureBase"] = []

    class Config:
        from_attributes = True


class FeatureCreate(BaseModel):
    epic_id: UUID4
    name: str
    urls: list[str]
    description: str


class FeatureUpdate(BaseModel):
    name: Optional[str] = None
    urls: Optional[list[str]] = None
    description: Optional[str] = None


class FeatureBase(FeatureCreate):
    id: UUID4


class Feature(FeatureBase):
    epic_id: UUID4
    user_stories: list[UserStoryBase] = []

    class Config:
        from_attributes = True


class UserStoryCreate(BaseModel):
    feature_id: UUID4
    title: str
    description: str


class UserStoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class UserStoryBase(UserStoryCreate):
    id: UUID4


class UserStory(UserStoryBase):
    feature_id: UUID4
    acceptance_criteria: list[AcceptanceCriteriaBase] = []


class AcceptanceCriteriaCreate(BaseModel):
    user_story_id: UUID4
    title: str
    description: str


class AcceptanceCriteriaUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class AcceptanceCriteriaBase(AcceptanceCriteriaCreate):
    id: UUID4


class AcceptanceCriteria(AcceptanceCriteriaBase):
    user_story_id: UUID4
    tests: list[TestBase] = []

    class Config:
        from_attributes = True


class TestCreate(BaseModel):
    acceptance_criteria_id: UUID4
    name: str
    description: str
    url: str
    category: TestCategory


class TestUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    category: Optional[TestCategory] = None
    status: Optional[TestStatus] = None


class TestBase(TestCreate):
    id: UUID4


class Test(TestBase):
    status: TestStatus
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    acceptance_criteria_id: UUID4
    bugs: list[BugBase] = []

    class Config:
        from_attributes = True


class BugCreate(BaseModel):
    test_id: UUID4
    title: str
    description: str
    severity: SeverityLevel
    screenshots: list[str]
    url: str
    status: Optional[str]
    detected_at: datetime


class BugBase(BugCreate):
    id: UUID4


class Bug(BugBase):
    test_id: UUID4

    class Config:
        from_attributes = True
