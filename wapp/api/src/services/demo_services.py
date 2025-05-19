from fastapi import HTTPException, BackgroundTasks
from logging import getLogger
from uuid import uuid4
import traceback
from services.organization_services import create_organization
from services.product_services import create_product
from services.feature_services import create_feature
from services.test_services import poll_test_generation_status, trigger_test_generation
from dto.schemas import (
  DemoTestGenerateRequest,
  DemoTestGenerateResponse,
  FeatureCreate,
  OrganizationCreate,
  OrganizationType,
  ProductCreate,
  User
)

logger = getLogger(__name__)

async def generate_demo_tests(
    dto: DemoTestGenerateRequest,
    demo_account: User,
    background_tasks: BackgroundTasks
):
    try:
      # Find or create organization "default"
      organization_data = OrganizationCreate(
          name="default",
          type=OrganizationType.EDUCATION,
          logo_url=None
      )

      organization = await create_organization(organization_data, demo_account.id)

      # Create product
      product_data = ProductCreate(
          name=str(uuid4()),
          url=str(dto.url),
          description="Demo product",
          documentation="",
          organization_id=organization.id
      )
      product_with_epics = await create_product(product_data)
      epic_id = product_with_epics.epics[0].id

      # Create feature
      feature_data = FeatureCreate(
          name="default",
          description="Demo feature",
          epic_id=epic_id,
          urls=[str(dto.url)],
          access_conditions={
              "must_be_logged_in": False
          }
      )
      feature = await create_feature(feature_data)

      # Generate tests
      task = await trigger_test_generation(feature_id=feature.id)
      logger.info(f"Triggering test generation for feature {feature.id}. Response data: {task}")
      background_tasks.add_task(
          poll_test_generation_status,
          task_id=task["task_id"],
      )
      response_data = DemoTestGenerateResponse(feature_id=feature.id, task_id=task["task_id"])

      return response_data
    except HTTPException as e:
      raise e
    except Exception as e:
        logger.error(f"Error generating tests: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error generating tests: {str(e)}")
