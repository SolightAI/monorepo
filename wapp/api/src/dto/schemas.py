from __future__ import annotations
from pydantic import BaseModel, UUID4
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
    description: Optional[str] = None
    logo_url: Optional[str] = None
    type: OrganizationType


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    type: Optional[OrganizationType] = None
    settings: Optional[dict] = None


class Organization(OrganizationBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime
    settings: dict = {}

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

    class Config:
        from_attributes = True


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
    ERROR = "ERROR"


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
    name: str
    description: str


class UserStoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class UserStoryBase(UserStoryCreate):
    id: UUID4


class UserStory(UserStoryBase):
    feature_id: UUID4
    acceptance_criteria: list[AcceptanceCriteriaBase] = []


class AcceptanceCriteriaCreate(BaseModel):
    user_story_id: UUID4
    name: str
    description: str


class AcceptanceCriteriaUpdate(BaseModel):
    name: Optional[str] = None
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
    preconditions: str
    steps: str
    expected_results: str
    assertions: str
    secret_ids: Optional[List[UUID4]] = None


class TestUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    category: Optional[TestCategory] = None
    status: Optional[TestStatus] = None
    preconditions: Optional[str] = None
    steps: Optional[str] = None
    expected_results: Optional[str] = None
    assertions: Optional[str] = None
    secret_ids: Optional[List[UUID4]] = None


class TestBase(TestCreate):
    id: UUID4


class Test(TestBase):
    status: TestStatus
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    acceptance_criteria_id: UUID4
    secrets: List[Dict[str, Any]] = []
    bugs: list[BugBase] = []

    class Config:
        from_attributes = True


class BugCreate(BaseModel):
    test_id: UUID4
    name: str
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
    test_execution_id: Optional[UUID4] = None

    class Config:
        from_attributes = True


# Dashboard Schema Models
class MetricsSummary(BaseModel):
    """Summary metrics for the dashboard."""
    tests_total: int
    tests_by_status: Dict[str, int]
    bugs_total: int
    bugs_by_severity: Dict[str, int]
    test_pass_rate: float


class TrendDataPoint(BaseModel):
    """Data point for trend charts."""
    date: datetime
    count: int
    category: str


class FeatureHealth(BaseModel):
    """Health metrics for a feature."""
    feature_id: UUID4
    feature_name: str
    test_coverage: float  # percentage
    bug_count: int
    test_pass_rate: float  # percentage


class OrganizationHealth(BaseModel):
    """Health metrics for an organization."""
    avg_test_coverage: float  # percentage
    avg_bug_resolution_time: float  # in hours
    overall_health_score: float  # calculated score based on metrics
    total_products: int
    total_features: int
    total_tests: int
    total_bugs: int


class SecretType(str, Enum):
    """Type of secret for categorization and handling."""
    USERNAME_PASSWORD = "username_password"
    API_KEY = "api_key"
    ENVIRONMENT_VARIABLE = "environment_variable"
    CONNECTION_STRING = "connection_string"
    OAUTH_CREDENTIAL = "oauth_credential"
    OTHER = "other"


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

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True
