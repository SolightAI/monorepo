from tortoise import fields, models
from .schemas import TestStatus, SeverityLevel, TestCategory, OrganizationRole, OrganizationType, SecretType, ExecutorType


class User(models.Model):
    id = fields.IntField(pk=True)

    username = fields.CharField(max_length=255, unique=False)
    email = fields.CharField(max_length=255, unique=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    is_admin = fields.BooleanField(default=False)

    # Relations
    created_invitations = fields.ReverseRelation["Invitation"]
    used_invitation = fields.ReverseRelation["Invitation"]
    organizations = fields.ReverseRelation["OrganizationMember"]

    class Meta:
        table = "users"


class Organization(models.Model):
    id = fields.UUIDField(pk=True)
    name = fields.CharField(max_length=255)
    description = fields.TextField(null=True)
    logo_url = fields.CharField(max_length=255, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    type = fields.CharEnumField(OrganizationType)
    settings = fields.JSONField(default={})

    # Relations
    members = fields.ReverseRelation["OrganizationMember"]
    products = fields.ReverseRelation["Product"]
    invitations = fields.ReverseRelation["Invitation"]

    class Meta:
        table = "organizations"


class OrganizationMember(models.Model):
    id = fields.UUIDField(pk=True)
    joined_at = fields.DatetimeField(auto_now_add=True)
    role = fields.CharEnumField(OrganizationRole)

    # Relations
    user = fields.ForeignKeyField('models.User', related_name='organizations')
    organization = fields.ForeignKeyField('models.Organization', related_name='members')
    invited_by = fields.ForeignKeyField('models.User', related_name='invited_members', null=True)

    class Meta:
        table = "organization_members"
        unique_together = (("user", "organization"),)


class Invitation(models.Model):
    id = fields.UUIDField(pk=True)
    code = fields.CharField(max_length=36, unique=True)
    email = fields.CharField(max_length=255, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    expires_at = fields.DatetimeField(null=True)
    used = fields.BooleanField(default=False)
    used_at = fields.DatetimeField(null=True)
    role = fields.CharEnumField(OrganizationRole, null=True)

    # Relations
    created_by = fields.ForeignKeyField('models.User', related_name='created_invitations', null=True)
    used_by = fields.ForeignKeyField('models.User', related_name='used_invitation', null=True)
    organization = fields.ForeignKeyField('models.Organization', related_name='invitations', null=True)

    class Meta:
        table = "invitations"


class Product(models.Model):
    id = fields.UUIDField(pk=True)
    url = fields.CharField(max_length=255)
    name = fields.CharField(max_length=255)
    description = fields.TextField()  # summary of what we've ingested from the project
    documentation = fields.TextField()  # what we ingest from the project (e.g. Jira, Linear, etc.)
    links_to_documentation = fields.JSONField(default=[])  # links to external documentation

    # Relations
    organization = fields.ForeignKeyField('models.Organization', related_name='products', null=True)
    epics = fields.ReverseRelation["Epic"]

    class Meta:
        table = "products"


class Epic(models.Model):
    id = fields.UUIDField(pk=True)
    name = fields.CharField(max_length=255)
    description = fields.TextField()

    product = fields.ForeignKeyField("models.Product", related_name="epics")
    features = fields.ReverseRelation["Feature"]

    class Meta:
        table = "epics"


class Feature(models.Model):
    id = fields.UUIDField(pk=True)
    urls = fields.JSONField()  # where the feature is implemented
    name = fields.CharField(max_length=255)
    description = fields.TextField()

    # dependents = fields.ManyToManyField("models.Feature", related_name="dependencies")  # features depending on this feature
    dependencies = fields.ManyToManyField("models.Feature", related_name="dependents")  # features this feature depends on

    epic = fields.ForeignKeyField("models.Epic", related_name="features")
    user_stories = fields.ReverseRelation["UserStory"]
    acceptance_criteria = fields.ReverseRelation["AcceptanceCriteria"]
    tests = fields.ReverseRelation["Test"]

    class Meta:
        table = "features"


class UserStory(models.Model):
    id = fields.UUIDField(pk=True)
    name = fields.CharField(max_length=255)
    description = fields.TextField()

    feature = fields.ForeignKeyField("models.Feature", related_name="user_stories")

    class Meta:
        table = "user_stories"


class AcceptanceCriteria(models.Model):
    id = fields.UUIDField(pk=True)
    name = fields.CharField(max_length=255)
    description = fields.TextField()

    feature = fields.ForeignKeyField("models.Feature", related_name="acceptance_criteria")
    tests = fields.ReverseRelation["Test"]

    class Meta:
        table = "acceptance_criteria"


class Test(models.Model):
    id = fields.UUIDField(pk=True)
    url = fields.CharField(max_length=255)  # where to start the test
    name = fields.CharField(max_length=255)
    description = fields.TextField()
    preconditions = fields.TextField()
    steps = fields.TextField()
    expected_results = fields.TextField()
    assertions = fields.TextField()

    category = fields.CharEnumField(TestCategory)
    status = fields.CharEnumField(TestStatus, default=TestStatus.NOT_STARTED)

    started_at = fields.DatetimeField(null=True)
    ended_at = fields.DatetimeField(null=True)

    feature = fields.ForeignKeyField("models.Feature", related_name="tests")
    bugs = fields.ReverseRelation["Bug"]
    test_secrets = fields.ReverseRelation["TestSecret"]
    executions = fields.ReverseRelation["TestExecution"]

    class Meta:
        table = "tests"


class TestExecution(models.Model):
    """Model for storing each individual test execution."""
    id = fields.UUIDField(pk=True)
    status = fields.CharEnumField(TestStatus)
    environment = fields.CharField(max_length=50)  # dev, staging, production, etc.
    executor_type = fields.CharEnumField(ExecutorType)
    executor_name = fields.CharField(max_length=255, null=True)  # name of user or automation system
    started_at = fields.DatetimeField(auto_now_add=True)
    ended_at = fields.DatetimeField(null=True)
    duration_ms = fields.IntField(null=True)  # duration in milliseconds
    notes = fields.TextField(null=True)
    evidence = fields.JSONField(default=[])  # URLs to screenshots, logs, etc.
    metadata = fields.JSONField(default={})  # Any additional metadata about the execution
    tracing = fields.JSONField(default={})  # Any additional tracing data about the execution

    # Relations
    test = fields.ForeignKeyField("models.Test", related_name="executions")
    bugs = fields.ReverseRelation["Bug"]

    class Meta:
        table = "test_executions"


class Bug(models.Model):
    id = fields.UUIDField(pk=True)
    name = fields.CharField(max_length=255)
    description = fields.TextField()
    severity = fields.CharEnumField(SeverityLevel)
    url = fields.CharField(max_length=255)   # url of the bug
    screenshots = fields.JSONField(default=[])   # urls to screenshots of the bug
    status = fields.CharField(max_length=50, null=True)   # retrieved from Jira/Linear/other
    detected_at = fields.DatetimeField(auto_now_add=True)

    test = fields.ForeignKeyField("models.Test", related_name="bugs")
    test_execution = fields.ForeignKeyField("models.TestExecution", related_name="bugs", null=True)

    class Meta:
        table = "bugs"

    def __str__(self) -> str:
        return f"{self.name} - {self.severity} ({self.url})"


class Secret(models.Model):
    id = fields.UUIDField(pk=True)
    name = fields.CharField(max_length=255)
    description = fields.TextField(null=True)
    type = fields.CharEnumField(SecretType)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    expires_at = fields.DatetimeField(null=True)

    # Relations
    organization = fields.ForeignKeyField('models.Organization', related_name='secrets')
    product = fields.ForeignKeyField('models.Product', related_name='secrets', null=True)
    created_by = fields.ForeignKeyField('models.User', related_name='created_secrets')
    values = fields.ReverseRelation["SecretValue"]
    access_logs = fields.ReverseRelation["SecretAccess"]
    test_secrets = fields.ReverseRelation["TestSecret"]

    class Meta:
        table = "secrets"


class SecretValue(models.Model):
    id = fields.UUIDField(pk=True)
    key = fields.CharField(max_length=255)
    encrypted_value = fields.TextField()  # Encrypted value stored here
    is_required = fields.BooleanField(default=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    # Relations
    secret = fields.ForeignKeyField('models.Secret', related_name='values')

    class Meta:
        table = "secret_values"
        unique_together = (("secret", "key"),)


class SecretAccess(models.Model):
    id = fields.UUIDField(pk=True)
    action = fields.CharField(max_length=50)  # "view", "create", "update", "delete"
    accessed_at = fields.DatetimeField(auto_now_add=True)

    # Relations
    secret = fields.ForeignKeyField('models.Secret', related_name='access_logs')
    user = fields.ForeignKeyField('models.User', related_name='secret_access_logs')

    class Meta:
        table = "secret_access_logs"


class TestSecret(models.Model):
    id = fields.UUIDField(pk=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    # Relations
    test = fields.ForeignKeyField('models.Test', related_name='test_secrets')
    secret = fields.ForeignKeyField('models.Secret', related_name='test_secrets')

    class Meta:
        table = "test_secrets"
        unique_together = (("test", "secret"),)
