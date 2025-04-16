from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "features_features";
        DROP TABLE IF EXISTS "bugs";"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE "features_features" (
    "features_id" UUID NOT NULL REFERENCES "features" ("id") ON DELETE CASCADE,
    "feature_id" UUID NOT NULL REFERENCES "features" ("id") ON DELETE CASCADE
);"""
