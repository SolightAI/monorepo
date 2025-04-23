from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "tests" DROP COLUMN "ended_at";
        ALTER TABLE "tests" DROP COLUMN "status";
        ALTER TABLE "tests" DROP COLUMN "started_at";
        COMMENT ON COLUMN "test_executions"."status" IS 'PENDING: pending
PASSED: passed
FAILED: failed
ERROR: error
BLOCKED_BY_CAPTCHA: blocked_by_captcha
AGENT_LIMITATION: agent_limitation
UNEXISTING_FEATURE: unexisting_feature
UNKNOWN: unknown';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "tests" ADD "ended_at" TIMESTAMPTZ;
        ALTER TABLE "tests" ADD "status" VARCHAR(255) NOT NULL DEFAULT 'not_started';
        ALTER TABLE "tests" ADD "started_at" TIMESTAMPTZ;
        COMMENT ON COLUMN "test_executions"."status" IS 'NOT_STARTED: not_started
PENDING: pending
PASSED: passed
FAILED: failed
BLOCKED: blocked
SKIPPED: skipped
ERROR: error
BLOCKED_BY_CAPTCHA: blocked_by_captcha
AGENT_LIMITATION: agent_limitation
UNEXISTING_FEATURE: unexisting_feature';"""
