from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "organizations" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "logo_url" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" VARCHAR(255) NOT NULL,
    "settings" JSONB NOT NULL
);
COMMENT ON COLUMN "organizations"."type" IS 'ENTERPRISE: enterprise\nSTARTUP: startup\nINDIVIDUAL: individual\nEDUCATION: education';
CREATE TABLE IF NOT EXISTS "products" (
    "id" UUID NOT NULL PRIMARY KEY,
    "url" VARCHAR(1024) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "documentation" TEXT NOT NULL,
    "links_to_documentation" JSONB NOT NULL,
    "organization_id" UUID REFERENCES "organizations" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "epics" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "product_id" UUID NOT NULL REFERENCES "products" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "features" (
    "id" UUID NOT NULL PRIMARY KEY,
    "urls" JSONB NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "access_conditions" JSONB NOT NULL,
    "epic_id" UUID NOT NULL REFERENCES "epics" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "acceptance_criteria" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "feature_id" UUID NOT NULL REFERENCES "features" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "tests" (
    "id" UUID NOT NULL PRIMARY KEY,
    "url" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "preconditions" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "assertions" TEXT NOT NULL,
    "category" VARCHAR(255) NOT NULL,
    "status" VARCHAR(255) NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "feature_id" UUID NOT NULL REFERENCES "features" ("id") ON DELETE CASCADE
);
COMMENT ON COLUMN "tests"."category" IS 'SMOKE: SMOKE\nNEGATIVE: NEGATIVE';
COMMENT ON COLUMN "tests"."status" IS 'NOT_STARTED: NOT_STARTED\nPENDING: PENDING\nPASSED: PASSED\nFAILED: FAILED\nBLOCKED: BLOCKED\nSKIPPED: SKIPPED\nERROR: ERROR\nAGENT_LIMITATION: AGENT_LIMITATION\nUNEXISTING_FEATURE: UNEXISTING_FEATURE';
CREATE TABLE IF NOT EXISTS "test_executions" (
    "id" UUID NOT NULL PRIMARY KEY,
    "status" VARCHAR(255) NOT NULL,
    "environment" VARCHAR(50) NOT NULL,
    "executor_type" VARCHAR(255) NOT NULL,
    "executor_name" VARCHAR(255),
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "duration_ms" INT,
    "notes" TEXT,
    "evidence" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "tracing" JSONB NOT NULL,
    "test_id" UUID NOT NULL REFERENCES "tests" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_test_execut_test_id_8aad9d" ON "test_executions" ("test_id");
CREATE INDEX IF NOT EXISTS "idx_test_execut_test_id_023012" ON "test_executions" ("test_id", "started_at");
COMMENT ON COLUMN "test_executions"."status" IS 'NOT_STARTED: NOT_STARTED\nPENDING: PENDING\nPASSED: PASSED\nFAILED: FAILED\nBLOCKED: BLOCKED\nSKIPPED: SKIPPED\nERROR: ERROR\nAGENT_LIMITATION: AGENT_LIMITATION\nUNEXISTING_FEATURE: UNEXISTING_FEATURE';
COMMENT ON COLUMN "test_executions"."executor_type" IS 'MANUAL: MANUAL\nAUTOMATED: AUTOMATED\nCI_PIPELINE: CI_PIPELINE\nSCHEDULED: SCHEDULED';
COMMENT ON TABLE "test_executions" IS 'Model for storing each individual test execution.';
CREATE TABLE IF NOT EXISTS "bugs" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" VARCHAR(255) NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "screenshots" JSONB NOT NULL,
    "status" VARCHAR(50),
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "test_id" UUID NOT NULL REFERENCES "tests" ("id") ON DELETE CASCADE,
    "test_execution_id" UUID REFERENCES "test_executions" ("id") ON DELETE CASCADE
);
COMMENT ON COLUMN "bugs"."severity" IS 'CRITICAL: Critical\nHIGH: High\nMEDIUM: Medium\nLOW: Low';
CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "username" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_admin" BOOL NOT NULL DEFAULT False,
    "onboarding_completed" BOOL NOT NULL DEFAULT False
);
CREATE TABLE IF NOT EXISTS "invitations" (
    "id" UUID NOT NULL PRIMARY KEY,
    "code" VARCHAR(36) NOT NULL UNIQUE,
    "email" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "used" BOOL NOT NULL DEFAULT False,
    "used_at" TIMESTAMPTZ,
    "role" VARCHAR(255),
    "created_by_id" INT REFERENCES "users" ("id") ON DELETE CASCADE,
    "organization_id" UUID REFERENCES "organizations" ("id") ON DELETE CASCADE,
    "used_by_id" INT REFERENCES "users" ("id") ON DELETE CASCADE
);
COMMENT ON COLUMN "invitations"."role" IS 'OWNER: owner\nADMIN: admin\nMEMBER: member\nGUEST: guest';
CREATE TABLE IF NOT EXISTS "organization_members" (
    "id" UUID NOT NULL PRIMARY KEY,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" VARCHAR(255) NOT NULL,
    "invited_by_id" INT REFERENCES "users" ("id") ON DELETE CASCADE,
    "organization_id" UUID NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
    "user_id" INT NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_organizatio_user_id_a28e0b" UNIQUE ("user_id", "organization_id")
);
COMMENT ON COLUMN "organization_members"."role" IS 'OWNER: owner\nADMIN: admin\nMEMBER: member\nGUEST: guest';
CREATE TABLE IF NOT EXISTS "secrets" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "created_by_id" INT NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "organization_id" UUID NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
    "product_id" UUID REFERENCES "products" ("id") ON DELETE CASCADE
);
COMMENT ON COLUMN "secrets"."type" IS 'USERNAME_PASSWORD: username_password\nGOOGLE: oauth_credential:google';
CREATE TABLE IF NOT EXISTS "secret_access_logs" (
    "id" UUID NOT NULL PRIMARY KEY,
    "action" VARCHAR(50) NOT NULL,
    "accessed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "secret_id" UUID NOT NULL REFERENCES "secrets" ("id") ON DELETE CASCADE,
    "user_id" INT NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "secret_values" (
    "id" UUID NOT NULL PRIMARY KEY,
    "key" VARCHAR(255) NOT NULL,
    "encrypted_value" TEXT NOT NULL,
    "is_required" BOOL NOT NULL DEFAULT True,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "secret_id" UUID NOT NULL REFERENCES "secrets" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_secret_valu_secret__935722" UNIQUE ("secret_id", "key")
);
CREATE TABLE IF NOT EXISTS "test_secrets" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "secret_id" UUID NOT NULL REFERENCES "secrets" ("id") ON DELETE CASCADE,
    "test_id" UUID NOT NULL REFERENCES "tests" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_test_secret_test_id_168b03" UNIQUE ("test_id", "secret_id")
);
CREATE TABLE IF NOT EXISTS "user_stories" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "feature_id" UUID NOT NULL REFERENCES "features" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "aerich" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "version" VARCHAR(255) NOT NULL,
    "app" VARCHAR(100) NOT NULL,
    "content" JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS "features_features" (
    "features_id" UUID NOT NULL REFERENCES "features" ("id") ON DELETE CASCADE,
    "feature_id" UUID NOT NULL REFERENCES "features" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "uidx_features_fe_feature_bcd16e" ON "features_features" ("features_id", "feature_id");"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        """
