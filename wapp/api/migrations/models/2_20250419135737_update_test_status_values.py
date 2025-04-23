from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "tests" ALTER COLUMN "status" SET DEFAULT 'pending';
        COMMENT ON COLUMN "tests"."status" IS 'PENDING: pending
PASSED: passed
FAILED: failed
ERROR: error
BLOCKED_BY_CAPTCHA: blocked_by_captcha
AGENT_LIMITATION: agent_limitation
UNEXISTING_FEATURE: unexisting_feature
UNKNOWN: unknown';
        COMMENT ON COLUMN "test_executions"."status" IS 'PENDING: pending
PASSED: passed
FAILED: failed
ERROR: error
BLOCKED_BY_CAPTCHA: blocked_by_captcha
AGENT_LIMITATION: agent_limitation
UNEXISTING_FEATURE: unexisting_feature
UNKNOWN: unknown';
        UPDATE "tests" SET "status" = 'pending' WHERE "status" = 'PENDING';
        UPDATE "tests" SET "status" = 'passed' WHERE "status" = 'PASSED';
        UPDATE "tests" SET "status" = 'failed' WHERE "status" = 'FAILED';
        UPDATE "tests" SET "status" = 'error' WHERE "status" = 'ERROR';
        UPDATE "tests" SET "status" = 'blocked_by_captcha' WHERE "status" = 'BLOCKED_BY_CAPTCHA';
        UPDATE "tests" SET "status" = 'agent_limitation' WHERE "status" = 'AGENT_LIMITATION';
        UPDATE "tests" SET "status" = 'unexisting_feature' WHERE "status" = 'UNEXISTING_FEATURE';
        UPDATE "tests" SET "status" = 'unknown' WHERE "status" = 'UNKNOWN';
        UPDATE "test_executions" SET "status" = 'pending' WHERE "status" = 'PENDING';
        UPDATE "test_executions" SET "status" = 'passed' WHERE "status" = 'PASSED';
        UPDATE "test_executions" SET "status" = 'failed' WHERE "status" = 'FAILED';
        UPDATE "test_executions" SET "status" = 'error' WHERE "status" = 'ERROR';
        UPDATE "test_executions" SET "status" = 'blocked_by_captcha' WHERE "status" = 'BLOCKED_BY_CAPTCHA';
        UPDATE "test_executions" SET "status" = 'agent_limitation' WHERE "status" = 'AGENT_LIMITATION';
        UPDATE "test_executions" SET "status" = 'unexisting_feature' WHERE "status" = 'UNEXISTING_FEATURE';
        UPDATE "test_executions" SET "status" = 'unknown' WHERE "status" = 'UNKNOWN';
        UPDATE "tests" SET "status" = 'unknown' WHERE "status" IN ('not_started', 'blocked', 'skipped');
        UPDATE "test_executions" SET "status" = 'unknown' WHERE "status" IN ('not_started', 'blocked', 'skipped');"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "tests" ALTER COLUMN "status" SET DEFAULT 'PENDING';
        COMMENT ON COLUMN "tests"."status" IS 'PENDING: PENDING
PASSED: PASSED
FAILED: FAILED
ERROR: ERROR
BLOCKED_BY_CAPTCHA: BLOCKED_BY_CAPTCHA
AGENT_LIMITATION: AGENT_LIMITATION
UNEXISTING_FEATURE: UNEXISTING_FEATURE
UNKNOWN: UNKNOWN';
        COMMENT ON COLUMN "test_executions"."status" IS 'PENDING: PENDING
PASSED: PASSED
FAILED: FAILED
ERROR: ERROR
BLOCKED_BY_CAPTCHA: BLOCKED_BY_CAPTCHA
AGENT_LIMITATION: AGENT_LIMITATION
UNEXISTING_FEATURE: UNEXISTING_FEATURE
UNKNOWN: UNKNOWN';
        UPDATE "tests" SET "status" = 'PENDING' WHERE "status" = 'pending';
        UPDATE "tests" SET "status" = 'PASSED' WHERE "status" = 'passed';
        UPDATE "tests" SET "status" = 'FAILED' WHERE "status" = 'failed';
        UPDATE "tests" SET "status" = 'ERROR' WHERE "status" = 'error';
        UPDATE "tests" SET "status" = 'BLOCKED_BY_CAPTCHA' WHERE "status" = 'blocked_by_captcha';
        UPDATE "tests" SET "status" = 'AGENT_LIMITATION' WHERE "status" = 'agent_limitation';
        UPDATE "tests" SET "status" = 'UNEXISTING_FEATURE' WHERE "status" = 'unexisting_feature';
        UPDATE "tests" SET "status" = 'UNKNOWN' WHERE "status" = 'unknown';
        UPDATE "test_executions" SET "status" = 'PENDING' WHERE "status" = 'pending';
        UPDATE "test_executions" SET "status" = 'PASSED' WHERE "status" = 'passed';
        UPDATE "test_executions" SET "status" = 'FAILED' WHERE "status" = 'failed';
        UPDATE "test_executions" SET "status" = 'ERROR' WHERE "status" = 'error';
        UPDATE "test_executions" SET "status" = 'BLOCKED_BY_CAPTCHA' WHERE "status" = 'blocked_by_captcha';
        UPDATE "test_executions" SET "status" = 'AGENT_LIMITATION' WHERE "status" = 'agent_limitation';
        UPDATE "test_executions" SET "status" = 'UNEXISTING_FEATURE' WHERE "status" = 'unexisting_feature';
        UPDATE "test_executions" SET "status" = 'UNKNOWN' WHERE "status" = 'unknown';
        UPDATE "tests" SET "status" = 'NOT_STARTED' WHERE "status" = 'UNKNOWN';
        UPDATE "test_executions" SET "status" = 'NOT_STARTED' WHERE "status" = 'UNKNOWN';"""
