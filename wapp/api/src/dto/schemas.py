from __future__ import annotations
from pydantic import BaseModel, UUID4, Field, ConfigDict, HttpUrl, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class OrganizationType(str, Enum):
    ENTERPRISE = "enterprise"
    STARTUP = "startup"
    INDIVIDUAL = "individual"
    EDUCATION = "education"


class OrganizationRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    GUEST = "guest"


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


class OrganizationBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    type: OrganizationType


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    type: Optional[OrganizationType] = None
    settings: Optional[dict] = None


class Organization(OrganizationBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime
    settings: dict = {}

    model_config = ConfigDict(from_attributes=True)


class PublicOrganization(BaseModel):
    """Schema for public organization information used in invitation flows."""
    id: UUID4
    name: str
    logo_url: Optional[str] = None
    type: OrganizationType

    class Config:
        from_attributes = True


class OrganizationWithMembers(Organization):
    members: List["OrganizationMember"] = []


class OrganizationMemberBase(BaseModel):
    user_id: int
    organization_id: UUID4
    role: OrganizationRole
    invited_by_id: Optional[int] = None


class OrganizationMemberCreate(BaseModel):
    user_id: int
    role: OrganizationRole
    invited_by_id: Optional[int] = None


class OrganizationMemberUpdate(BaseModel):
    role: Optional[OrganizationRole] = None


class OrganizationMember(OrganizationMemberBase):
    id: UUID4
    joined_at: datetime
    user: Optional[UserPrivate] = None

    model_config = ConfigDict(from_attributes=True)


class InvitationBase(BaseModel):
    email: Optional[str] = None
    expires_at: Optional[datetime] = None
    organization_id: Optional[UUID4] = None
    role: Optional[OrganizationRole] = None


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

    model_config = ConfigDict(from_attributes=True)


class UserRegister(BaseModel):
    username: str
    email: str
    invitation_code: str


class TokenData(BaseModel):
    username: str | None = None


class TestStatus(str, Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    BLOCKED_BY_CAPTCHA = "blocked_by_captcha"
    AGENT_LIMITATION = "agent_limitation"
    NOT_FOUND = "not_found"
    UNKNOWN = "unknown"


class TestCategory(str, Enum):
    SMOKE = "SMOKE"  # testing basic functionalities of a feature
    NEGATIVE = "NEGATIVE"  # testing a negative path of a feature
    # END_TO_END = "END_TO_END"  # multi-step tests, testing a feature as a whole (flow tests)
    # REGRESSION = "REGRESSION"  # testing a feature after a bug has been fixed
    # INTEGRATION = "INTEGRATION"  # testing the integration between features
    # PERFORMANCE = "PERFORMANCE"  # testing the performance of a feature
    # USABILITY = "USABILITY"  # testing the usability of a feature
    # COMPATIBILITY = "COMPATIBILITY"  # testing the compatibility of a feature with different browsers, devices, etc.
    # LOCALIZATION = "LOCALIZATION"  # testing the localization of a feature


class ExecutorType(str, Enum):
    """Type of executor that performed the test."""
    MANUAL = "MANUAL"
    AUTOMATED = "AUTOMATED"
    CI_PIPELINE = "CI_PIPELINE"
    SCHEDULED = "SCHEDULED"


class LinkDocument(BaseModel):
    name: str
    url: str


class ProductBase(BaseModel):
    url: str
    name: str
    description: str
    documentation: str
    links_to_documentation: list[LinkDocument] = []
    organization_id: Optional[UUID4] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    url: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    documentation: Optional[str] = None
    links_to_documentation: Optional[list[LinkDocument]] = None
    organization_id: Optional[UUID4] = None


class Product(ProductBase):
    id: UUID4
    epics: list[EpicBase] = []

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


class FeatureCreate(BaseModel):
    epic_id: UUID4
    name: str
    urls: list[str]
    description: str
    access_conditions: dict[str, Any]


class FeatureUpdate(BaseModel):
    name: Optional[str] = None
    urls: list[str] = Field(default_factory=list)
    description: Optional[str] = None
    access_conditions: Optional[dict[str, Any]] = None


class FeatureBase(FeatureCreate):
    id: UUID4


class Feature(FeatureBase):
    epic_id: UUID4
    user_stories: list[UserStoryBase] = []
    acceptance_criteria: list[AcceptanceCriteriaBase] = []
    tests: list[TestBase] = []

    model_config = ConfigDict(from_attributes=True)


class UserStoryCreate(BaseModel):
    feature_id: UUID4
    name: str
    description: str


class UserStoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class UserStoryBase(UserStoryCreate):
    id: UUID4


class UserStory(UserStoryBase):
    feature_id: UUID4

    model_config = ConfigDict(from_attributes=True)


class AcceptanceCriteriaCreate(BaseModel):
    feature_id: UUID4
    name: str
    description: str


class AcceptanceCriteriaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class AcceptanceCriteriaBase(AcceptanceCriteriaCreate):
    id: UUID4


class AcceptanceCriteria(AcceptanceCriteriaBase):
    feature_id: UUID4

    model_config = ConfigDict(from_attributes=True)


class TestCreate(BaseModel):
    feature_id: UUID4
    name: str
    description: str
    category: TestCategory
    preconditions: str
    steps: str
    assertions: str
    secret_ids: Optional[List[UUID4]] = None


class TestUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[TestCategory] = None
    preconditions: Optional[str] = None
    steps: Optional[str] = None
    assertions: Optional[str] = None
    secret_ids: Optional[List[UUID4]] = None


class TestBase(TestCreate):
    id: UUID4


class Test(TestBase):
    feature_id: UUID4
    secrets: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)


class SecretType(str, Enum):
    """Type of secret for categorization and handling."""
    USERNAME_PASSWORD = "username_password"
    GOOGLE_OAUTH = "google_oauth"


class SecretBase(BaseModel):
    """Base class for Secret models."""
    name: str
    description: Optional[str] = None
    type: SecretType
    organization_id: UUID4
    product_id: Optional[UUID4] = None
    expires_at: Optional[datetime] = None


class SecretCreate(SecretBase):
    """Schema for creating a new secret."""
    values: Dict[str, str]


class SecretUpdate(BaseModel):
    """Schema for updating an existing secret."""
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[SecretType] = None
    organization_id: Optional[UUID4] = None
    product_id: Optional[UUID4] = None
    expires_at: Optional[datetime] = None


class Secret(SecretBase):
    """Schema for a secret with its metadata."""
    id: UUID4
    created_at: datetime
    updated_at: datetime
    created_by_id: int

    model_config = ConfigDict(from_attributes=True)


class SecretValueBase(BaseModel):
    """Base class for SecretValue models."""
    key: str
    is_required: bool = True


class SecretValueCreate(SecretValueBase):
    """Schema for creating a new secret value."""
    value: str
    secret_id: UUID4


class SecretValueUpdate(BaseModel):
    """Schema for updating an existing secret value."""
    value: str


class SecretValue(SecretValueBase):
    """Schema for a secret value."""
    id: UUID4
    created_at: datetime
    updated_at: datetime
    secret_id: UUID4
    # Note: actual value is not included in responses

    model_config = ConfigDict(from_attributes=True)


class SecretWithValues(Secret):
    """Schema for a secret with its decrypted values."""
    values: Dict[str, str]


class SecretAccess(BaseModel):
    """Schema for logging secret access."""
    id: UUID4
    secret_id: UUID4
    user_id: int
    accessed_at: datetime
    action: str  # view, create, update, delete

    model_config = ConfigDict(from_attributes=True)


class TestSecretCreate(BaseModel):
    """Schema for creating a new test-secret relationship."""
    test_id: UUID4
    secret_id: UUID4


class TestSecretBase(TestSecretCreate):
    """Base class for TestSecret models."""
    id: UUID4
    created_at: datetime


class TestSecret(TestSecretBase):
    """Schema for a test-secret relationship."""
    # Secret metadata for convenience
    secret_name: Optional[str] = None
    secret_type: Optional[SecretType] = None

    model_config = ConfigDict(from_attributes=True)


class TestExecutionCreate(BaseModel):
    """Schema for creating a new test execution."""
    test_id: UUID4
    status: TestStatus = TestStatus.PENDING
    environment: str
    executor_type: ExecutorType
    executor_name: Optional[str] = None
    notes: Optional[str] = None
    evidence: List[str] = []
    metadata: Dict[str, Any] = {}
    run_without_cache: Optional[bool] = False


class TestExecutionUpdate(BaseModel):
    """Schema for updating an existing test execution."""
    status: Optional[TestStatus] = None
    environment: Optional[str] = None
    executor_name: Optional[str] = None
    ended_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    notes: Optional[str] = None
    evidence: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    tracing: Optional[Dict[str, Any]] = None


class TestExecution(BaseModel):
    """Schema for a test execution response."""
    id: UUID4
    test_id: UUID4
    status: TestStatus
    environment: str
    executor_type: ExecutorType
    executor_name: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    notes: Optional[str] = None
    evidence: List[str] = []
    metadata: Dict[str, Any] = {}
    tracing: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)


class TestExecutionElement(BaseModel):
    """Schema for a test execution element."""
    id: UUID4
    test_id: UUID4
    status: TestStatus
    started_at: datetime
    ended_at: datetime | None = None
    environment: str
    executor_type: ExecutorType


class LatestTestExecutionRequest(BaseModel):
    """Schema for requesting the latest execution for multiple tests."""
    test_ids: List[UUID4]


class LatestTestExecutionResponse(BaseModel):
    """Schema for the response containing the latest execution details for a test."""
    test_id: UUID4
    execution_id: Optional[UUID4] = None
    status: Optional[TestStatus] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

class DemoTestGenerateRequest(BaseModel):
    """Schema for generating tests using a demo"""
    url: HttpUrl

class DemoTestGenerateResponse(BaseModel):
    """Schema for the response containing demo tests generation details"""
    feature_id: UUID4
    task_id: UUID4

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    invitation_code: Optional[str] = None


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    invitation_code: Optional[str] = None
