from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        UPDATE "secrets" SET "type" = 'google_oauth' WHERE "type" = 'oauth_credential';
        COMMENT ON COLUMN "secrets"."type" IS 'USERNAME_PASSWORD: username_password
GOOGLE_OAUTH: google_oauth';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        UPDATE "secrets" SET "type" = 'oauth_credential' WHERE "type" = 'google_oauth';
        COMMENT ON COLUMN "secrets"."type" IS 'USERNAME_PASSWORD: username_password
GOOGLE: oauth_credential:google';"""
