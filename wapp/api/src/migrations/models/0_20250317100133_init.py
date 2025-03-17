from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "organizations" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "description" TEXT,
    "logo_url" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" VARCHAR(10) NOT NULL,
    "settings" JSONB NOT NULL
);
COMMENT ON COLUMN "organizations"."type" IS 'ENTERPRISE: enterprise\nSTARTUP: startup\nINDIVIDUAL: individual\nEDUCATION: education';
CREATE TABLE IF NOT EXISTS "products" (
    "id" UUID NOT NULL PRIMARY KEY,
    "url" VARCHAR(255) NOT NULL,
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
    "epic_id" UUID NOT NULL REFERENCES "epics" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "username" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_admin" BOOL NOT NULL DEFAULT False
);
CREATE TABLE IF NOT EXISTS "invitations" (
    "id" UUID NOT NULL PRIMARY KEY,
    "code" VARCHAR(36) NOT NULL UNIQUE,
    "email" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "used" BOOL NOT NULL DEFAULT False,
    "used_at" TIMESTAMPTZ,
    "role" VARCHAR(6),
    "created_by_id" INT REFERENCES "users" ("id") ON DELETE CASCADE,
    "organization_id" UUID REFERENCES "organizations" ("id") ON DELETE CASCADE,
    "used_by_id" INT REFERENCES "users" ("id") ON DELETE CASCADE
);
COMMENT ON COLUMN "invitations"."role" IS 'OWNER: owner\nADMIN: admin\nMEMBER: member\nGUEST: guest';
CREATE TABLE IF NOT EXISTS "organization_members" (
    "id" UUID NOT NULL PRIMARY KEY,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" VARCHAR(6) NOT NULL,
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
    "type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "created_by_id" INT NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "organization_id" UUID NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
    "product_id" UUID REFERENCES "products" ("id") ON DELETE CASCADE
);
COMMENT ON COLUMN "secrets"."type" IS 'USERNAME_PASSWORD: username_password\nAPI_KEY: api_key\nENVIRONMENT_VARIABLE: environment_variable\nCONNECTION_STRING: connection_string\nOAUTH_CREDENTIAL: oauth_credential\nOTHER: other';
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
CREATE TABLE IF NOT EXISTS "user_stories" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "feature_id" UUID NOT NULL REFERENCES "features" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "acceptance_criteria" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "user_story_id" UUID NOT NULL REFERENCES "user_stories" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "tests" (
    "id" UUID NOT NULL PRIMARY KEY,
    "url" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "preconditions" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "expected_results" TEXT NOT NULL,
    "assertions" TEXT NOT NULL,
    "category" VARCHAR(13) NOT NULL,
    "status" VARCHAR(11) NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "acceptance_criteria_id" UUID NOT NULL REFERENCES "acceptance_criteria" ("id") ON DELETE CASCADE,
    "secret_id" UUID REFERENCES "secrets" ("id") ON DELETE CASCADE
);
COMMENT ON COLUMN "tests"."category" IS 'SMOKE: SMOKE\nFUNCTIONAL: FUNCTIONAL\nEND_TO_END: END_TO_END\nUNIT: UNIT\nREGRESSION: REGRESSION\nINTEGRATION: INTEGRATION\nPERFORMANCE: PERFORMANCE\nUSABILITY: USABILITY\nCOMPATIBILITY: COMPATIBILITY\nLOCALIZATION: LOCALIZATION';
COMMENT ON COLUMN "tests"."status" IS 'NOT_STARTED: NOT_STARTED\nPENDING: PENDING\nPASSED: PASSED\nFAILED: FAILED\nBLOCKED: BLOCKED\nSKIPPED: SKIPPED';
CREATE TABLE IF NOT EXISTS "bugs" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" VARCHAR(8) NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "screenshots" JSONB NOT NULL,
    "status" VARCHAR(50),
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "test_id" UUID NOT NULL REFERENCES "tests" ("id") ON DELETE CASCADE
);
COMMENT ON COLUMN "bugs"."severity" IS 'CRITICAL: Critical\nHIGH: High\nMEDIUM: Medium\nLOW: Low';
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
