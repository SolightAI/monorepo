import logging
from typing import Any, Optional

from src.common.dto import Product, Feature, Epic
from src.config import Config

logger = logging.getLogger(__name__)


async def handler(
  config: Config,
  job_id: str,
  product: Product,
  epic: Epic,
  feature: Feature,
  secrets: Optional[list[dict[str, Any]]] = None,
) -> None:
  try:
    logger.info(f"[{job_id}] Test generation: {epic.name}/{product.name}/{feature.name}")
  except Exception as e:
    logger.error(f"[{job_id}] Error while generating test: {e}")
    raise e