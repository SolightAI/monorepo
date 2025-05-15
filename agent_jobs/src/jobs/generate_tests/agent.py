import logging

from src.common.dto import Product, Epic, Feature

logger = logging.getLogger(__name__)

async def run(
  product: Product,
  epic: Epic,
  feature: Feature,
  cookie_file: str | None = None,
  local_storage: str | None = None,
)