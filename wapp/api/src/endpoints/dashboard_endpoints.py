from fastapi import APIRouter, Depends, Query
from typing import List, Optional, Dict
from pydantic import UUID4

from services.dashboard_services import (
    get_metrics_summary,
    get_test_trend_data,
    get_bug_trend_data,
    get_feature_health_data,
    get_organization_health_data,
    get_test_execution_trend_data,
    get_test_execution_environment_comparison
)
from dto.schemas import (
    User as UserModel,
    MetricsSummary,
    TrendDataPoint,
    FeatureHealth,
    OrganizationHealth
)
from dependencies import get_current_user_dependency


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class TimeRange(str):
    SEVEN_DAYS = "7d"
    THIRTY_DAYS = "30d"
    NINETY_DAYS = "90d"
    ALL_TIME = "all"


@router.get("/metrics/summary")
async def get_summary_metrics(
    user: UserModel = Depends(get_current_user_dependency),
    product_id: Optional[UUID4] = None,
) -> MetricsSummary:
    """
    Get summary metrics for the dashboard.

    This endpoint returns the total test count, tests grouped by status,
    total bug count, bugs grouped by severity, and overall test pass rate.

    Args:
        user: The authenticated user
        product_id: Optional product ID to filter metrics by

    Returns:
        A MetricsSummary object containing the requested metrics
    """
    return await get_metrics_summary(user, product_id)


@router.get("/metrics/tests/trend")
async def get_tests_trend(
    time_range: str = Query(TimeRange.THIRTY_DAYS, description="Time range for the trend data"),
    product_id: Optional[UUID4] = None,
    user: UserModel = Depends(get_current_user_dependency),
) -> List[TrendDataPoint]:
    """
    Get test execution trend data for visualization.

    Args:
        time_range: Time range for the data (7d, 30d, 90d, all)
        product_id: Optional product ID to filter metrics by
        user: The authenticated user

    Returns:
        A list of trend data points for visualization
    """
    return await get_test_trend_data(user, time_range, product_id)


@router.get("/metrics/bugs/trend")
async def get_bugs_trend(
    time_range: str = Query(TimeRange.THIRTY_DAYS, description="Time range for the trend data"),
    product_id: Optional[UUID4] = None,
    user: UserModel = Depends(get_current_user_dependency),
) -> List[TrendDataPoint]:
    """
    Get bug creation trend data for visualization.

    Args:
        time_range: Time range for the data (7d, 30d, 90d, all)
        product_id: Optional product ID to filter metrics by
        user: The authenticated user

    Returns:
        A list of trend data points for visualization
    """
    return await get_bug_trend_data(user, time_range, product_id)


@router.get("/metrics/features/health")
async def get_features_health(
    product_id: UUID4,
    user: UserModel = Depends(get_current_user_dependency),
) -> List[FeatureHealth]:
    """
    Get health metrics for features in a product.

    Args:
        product_id: Product ID to get feature health data for
        user: The authenticated user

    Returns:
        A list of feature health metrics
    """
    return await get_feature_health_data(user, product_id)


@router.get("/metrics/organization/health")
async def get_organization_health(
    user: UserModel = Depends(get_current_user_dependency),
) -> OrganizationHealth:
    """
    Get health metrics for the current organization.

    Args:
        user: The authenticated user

    Returns:
        Organization health metrics
    """
    return await get_organization_health_data(user)


@router.get("/metrics/test-executions/trend")
async def get_test_executions_trend(
    time_range: str = Query(TimeRange.THIRTY_DAYS, description="Time range for the trend data"),
    product_id: Optional[UUID4] = None,
    environment: Optional[str] = None,
    user: UserModel = Depends(get_current_user_dependency),
) -> List[TrendDataPoint]:
    """
    Get test execution trend data for visualization.

    This endpoint provides data about test executions over time, grouped by date and status.
    It can be filtered by product and environment.

    Args:
        time_range: Time range for the data (7d, 30d, 90d, all)
        product_id: Optional product ID to filter metrics by
        environment: Optional environment to filter by (e.g., 'development', 'staging')
        user: The authenticated user

    Returns:
        A list of trend data points for visualization
    """
    return await get_test_execution_trend_data(user, time_range, product_id, environment)


@router.get("/metrics/test-executions/environment-comparison")
async def get_environment_comparison(
    product_id: UUID4,
    time_range: str = Query(TimeRange.THIRTY_DAYS, description="Time range for the comparison data"),
    user: UserModel = Depends(get_current_user_dependency),
) -> Dict[str, Dict[str, int]]:
    """
    Get test execution comparison across different environments.

    This endpoint provides data to compare how tests perform across different
    environments (e.g., development, staging, production).

    Args:
        product_id: Product ID to get comparison data for
        time_range: Time range for the data (7d, 30d, 90d, all)
        user: The authenticated user

    Returns:
        Dictionary with environment names as keys and status counts as values
    """
    return await get_test_execution_environment_comparison(user, time_range, product_id)
