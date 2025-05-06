from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        UPDATE "test_executions" SET "status" = 'NOT_FOUND' WHERE "status" = 'UNEXISTING_FEATURE';
        COMMENT ON COLUMN "test_executions"."status" IS 'PENDING: pending
PASSED: passed
FAILED: failed
ERROR: error
BLOCKED_BY_CAPTCHA: blocked_by_captcha
AGENT_LIMITATION: agent_limitation
NOT_FOUND: not_found
UNKNOWN: unknown';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        UPDATE "test_executions" SET "status" = 'UNEXISTING_FEATURE' WHERE "status" = 'NOT_FOUND';
        COMMENT ON COLUMN "test_executions"."status" IS 'PENDING: pending
PASSED: passed
FAILED: failed
ERROR: error
BLOCKED_BY_CAPTCHA: blocked_by_captcha
AGENT_LIMITATION: agent_limitation
UNEXISTING_FEATURE: unexisting_feature
UNKNOWN: unknown';"""
