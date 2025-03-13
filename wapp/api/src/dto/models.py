from tortoise import fields, models
from .schemas import TestStatus, SeverityLevel, TestCategory


class User(models.Model):
    id = fields.IntField(pk=True)

    username = fields.CharField(max_length=255, unique=False)
    email = fields.CharField(max_length=255, unique=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    is_admin = fields.BooleanField(default=False)

    # Relations
    created_invitations = fields.ReverseRelation["Invitation"]
    used_invitation = fields.ReverseRelation["Invitation"]

    class Meta:
        table = "users"


class Invitation(models.Model):
    id = fields.UUIDField(pk=True)
    code = fields.CharField(max_length=36, unique=True)
    email = fields.CharField(max_length=255, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    expires_at = fields.DatetimeField(null=True)
    used = fields.BooleanField(default=False)
    used_at = fields.DatetimeField(null=True)

    # Relations
    created_by = fields.ForeignKeyField('models.User', related_name='created_invitations', null=True)
    used_by = fields.ForeignKeyField('models.User', related_name='used_invitation', null=True)

    class Meta:
        table = "invitations"


class Product(models.Model):
    id = fields.UUIDField(pk=True)
    url = fields.CharField(max_length=255)
    name = fields.CharField(max_length=255)
    description = fields.TextField()  # summary of what we've ingested from the project
    documentation = fields.TextField()  # what we ingest from the project (e.g. Jira, Linear, etc.)
    links_to_documentation = fields.JSONField(default=[])  # links to external documentation

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

    class Meta:
        table = "features"


class UserStory(models.Model):
    id = fields.UUIDField(pk=True)
    title = fields.CharField(max_length=255)
    description = fields.TextField()

    feature = fields.ForeignKeyField("models.Feature", related_name="user_stories")

    class Meta:
        table = "user_stories"


class AcceptanceCriteria(models.Model):
    id = fields.UUIDField(pk=True)
    title = fields.CharField(max_length=255)
    description = fields.TextField()

    user_story = fields.ForeignKeyField("models.UserStory", related_name="acceptance_criteria")
    tests = fields.ReverseRelation["Test"]

    class Meta:
        table = "acceptance_criteria"


class Test(models.Model):
    id = fields.UUIDField(pk=True)
    name = fields.CharField(max_length=255)
    description = fields.TextField()
    url = fields.CharField(max_length=255)  # where to store the test
    category = fields.CharEnumField(TestCategory)
    status = fields.CharEnumField(TestStatus, default=TestStatus.NOT_STARTED)
    started_at = fields.DatetimeField(null=True)
    ended_at = fields.DatetimeField(null=True)

    acceptance_criteria = fields.ForeignKeyField("models.AcceptanceCriteria", related_name="tests")
    bugs = fields.ReverseRelation["Bug"]

    class Meta:
        table = "tests"


class Bug(models.Model):
    id = fields.UUIDField(pk=True)
    title = fields.CharField(max_length=255)
    description = fields.TextField()
    severity = fields.CharEnumField(SeverityLevel)
    url = fields.CharField(max_length=255)   # url of the bug
    screenshots = fields.JSONField(default=[])   # urls to screenshots of the bug
    status = fields.CharField(max_length=50, null=True)   # retrieved from Jira/Linear/other
    detected_at = fields.DatetimeField(auto_now_add=True)

    test = fields.ForeignKeyField("models.Test", related_name="bugs")

    class Meta:
        table = "bugs"

    def __str__(self) -> str:
        return f"{self.title} - {self.severity} ({self.url})"
