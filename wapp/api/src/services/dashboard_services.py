from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import UUID4

from dto.schemas import (
    User as UserModel,
    TestStatus,
    SeverityLevel,
    MetricsSummary,
    TrendDataPoint,
    FeatureHealth,
    OrganizationHealth
)
from dto.models import (
    Test as TestModel,
    Bug as BugModel,
    Product as ProductModel,
)
from services.organization_services import get_organizations_for_user
from services.product_services import get_product
from services.bug_services import get_bugs_by_product_path
from services.test_services import get_tests_by_product_path


async def get_metrics_summary(user: UserModel, product_id: Optional[UUID4] = None) -> MetricsSummary:
    """
    Get summary metrics for the dashboard.

    Args:
        user: The current user
        product_id: Optional product ID to filter metrics by

    Returns:
        MetricsSummary object containing summary metrics
    """
    # Get organizations for the current user
    organizations = await get_organizations_for_user(user.id)

    # Check if user has any organizations
    if not organizations:
        return MetricsSummary(
            tests_total=0,
            tests_by_status={},
            bugs_total=0,
            bugs_by_severity={},
            test_pass_rate=0
        )

    # Use the first organization by default
    organization = organizations[0]

    # Initialize metrics
    tests_by_status = {status.value: 0 for status in TestStatus}
    bugs_by_severity = {severity.value: 0 for severity in SeverityLevel}
    tests_total = 0
    bugs_total = 0

    if product_id:
        # Get product to get its URL
        product = await get_product(product_id)
        if not product or product.organization_id != organization.id:
            raise ValueError("Product not found or not accessible")

        # Get tests and bugs for this product
        tests = await get_tests_by_product_path(product.url)
        bugs = await get_bugs_by_product_path(product.url)
    else:
        # Get all products for this organization
        products = await ProductModel.filter(organization_id=organization.id)

        # Get all tests and bugs for all products
        tests = []
        bugs = []
        for product in products:
            product_tests = await get_tests_by_product_path(product.url)
            product_bugs = await get_bugs_by_product_path(product.url)
            tests.extend(product_tests)
            bugs.extend(product_bugs)

    # Count tests by status
    tests_total = len(tests)
    for test in tests:
        tests_by_status[test.status] += 1

    # Count bugs by severity
    bugs_total = len(bugs)
    for bug in bugs:
        bugs_by_severity[bug.severity] += 1

    # Calculate test pass rate
    passed_tests = tests_by_status.get(TestStatus.PASSED.value, 0)
    test_pass_rate = (passed_tests / tests_total) * 100 if tests_total > 0 else 0

    return MetricsSummary(
        tests_total=tests_total,
        tests_by_status=tests_by_status,
        bugs_total=bugs_total,
        bugs_by_severity=bugs_by_severity,
        test_pass_rate=test_pass_rate
    )


async def get_time_range_dates(time_range: str) -> datetime:
    """
    Get the start date for a time range.

    Args:
        time_range: The time range string (7d, 30d, 90d, all)

    Returns:
        The start date for the time range
    """
    now = datetime.now()

    if time_range == "7d":
        return now - timedelta(days=7)
    elif time_range == "30d":
        return now - timedelta(days=30)
    elif time_range == "90d":
        return now - timedelta(days=90)
    else:  # all time
        return datetime.min


async def get_test_trend_data(
    user: UserModel,
    time_range: str,
    product_id: Optional[UUID4] = None
) -> List[TrendDataPoint]:
    """
    Get test execution trend data for chart visualization.

    Args:
        user: The current user
        time_range: Time period to get data for (7d, 30d, 90d, all)
        product_id: Optional product ID to filter data by

    Returns:
        List of data points for the trend chart
    """
    # Get organizations for the current user
    organizations = await get_organizations_for_user(user.id)

    # Check if user has any organizations
    if not organizations:
        return []

    # Use the first organization by default
    organization = organizations[0]

    # Get start date based on time range
    start_date = await get_time_range_dates(time_range)

    # Find relevant tests
    if product_id:
        product = await get_product(product_id)
        if not product or product.organization_id != organization.id:
            raise ValueError("Product not found or not accessible")

        tests = await get_tests_by_product_path(product.url)
    else:
        products = await ProductModel.filter(organization_id=organization.id)
        tests = []
        for product in products:
            product_tests = await get_tests_by_product_path(product.url)
            tests.extend(product_tests)

    # Filter tests by date and organize by day and status
    trend_data = []

    # Group tests by date and status
    date_status_counts = {}

    for test in tests:
        # Skip tests with no start date or before our time range
        if not test.started_at or test.started_at < start_date:
            continue

        # Format date as YYYY-MM-DD for grouping
        date_str = test.started_at.strftime("%Y-%m-%d")

        if date_str not in date_status_counts:
            date_status_counts[date_str] = {status.value: 0 for status in TestStatus}

        date_status_counts[date_str][test.status] += 1

    # Convert the grouped data to the trend data format
    for date_str, status_counts in date_status_counts.items():
        for status, count in status_counts.items():
            if count > 0:  # Only include non-zero counts
                trend_data.append(
                    TrendDataPoint(
                        date=datetime.strptime(date_str, "%Y-%m-%d"),
                        count=count,
                        category=status
                    )
                )

    return trend_data


async def get_bug_trend_data(
    user: UserModel,
    time_range: str,
    product_id: Optional[UUID4] = None
) -> List[TrendDataPoint]:
    """
    Get bug creation trend data for chart visualization.

    Args:
        user: The current user
        time_range: Time period to get data for (7d, 30d, 90d, all)
        product_id: Optional product ID to filter data by

    Returns:
        List of data points for the trend chart
    """
    # Get organizations for the current user
    organizations = await get_organizations_for_user(user.id)

    # Check if user has any organizations
    if not organizations:
        return []

    # Use the first organization by default
    organization = organizations[0]

    # Get start date based on time range
    start_date = await get_time_range_dates(time_range)

    # Find relevant bugs
    if product_id:
        product = await get_product(product_id)
        if not product or product.organization_id != organization.id:
            raise ValueError("Product not found or not accessible")

        bugs = await get_bugs_by_product_path(product.url)
    else:
        products = await ProductModel.filter(organization_id=organization.id)
        bugs = []
        for product in products:
            product_bugs = await get_bugs_by_product_path(product.url)
            bugs.extend(product_bugs)

    # Filter bugs by date and organize by day and severity
    trend_data = []

    # Group bugs by date and severity
    date_severity_counts = {}

    for bug in bugs:
        # Skip bugs before our time range
        if bug.detected_at < start_date:
            continue

        # Format date as YYYY-MM-DD for grouping
        date_str = bug.detected_at.strftime("%Y-%m-%d")

        if date_str not in date_severity_counts:
            date_severity_counts[date_str] = {severity.value: 0 for severity in SeverityLevel}

        date_severity_counts[date_str][bug.severity] += 1

    # Convert the grouped data to the trend data format
    for date_str, severity_counts in date_severity_counts.items():
        for severity, count in severity_counts.items():
            if count > 0:  # Only include non-zero counts
                trend_data.append(
                    TrendDataPoint(
                        date=datetime.strptime(date_str, "%Y-%m-%d"),
                        count=count,
                        category=severity
                    )
                )

    return trend_data


async def get_feature_health_data(user: UserModel, product_id: UUID4) -> List[FeatureHealth]:
    """
    Get health data for features in a product.

    Args:
        user: The current user
        product_id: ID of the product to get feature health for

    Returns:
        List of feature health data
    """
    # Get organizations for the current user
    organizations = await get_organizations_for_user(user.id)

    # Check if user has any organizations
    if not organizations:
        return []

    # Use the first organization by default
    organization = organizations[0]

    # Get product
    product = await get_product(product_id)
    if not product or product.organization_id != organization.id:
        raise ValueError("Product not found or not accessible")

    # Get all features for this product
    product_model = await ProductModel.get(id=product_id).prefetch_related('epics__features')

    feature_health_data = []

    # Process each feature
    for epic in product_model.epics:
        for feature in epic.features:
            # Get tests related to feature
            # Note: This is a simplified approach, as we don't have direct feature -> test mapping
            # In a real implementation, this would need to traverse through acceptance criteria
            tests_query = TestModel.filter(
                acceptance_criteria__user_story__feature_id=feature.id
            )
            tests = await tests_query.all()

            # Get bugs related to these tests
            test_ids = [test.id for test in tests]
            bugs_query = BugModel.filter(test_id__in=test_ids)
            bugs = await bugs_query.all()

            # Calculate feature metrics
            total_tests = len(tests)
            passed_tests = sum(1 for test in tests if test.status == TestStatus.PASSED.value)
            test_pass_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0

            # Calculate test coverage (simplified)
            # In a real implementation, this would be based on code coverage or requirements coverage
            test_coverage = (total_tests / 10) * 100  # Assuming 10 tests is 100% coverage
            test_coverage = min(test_coverage, 100)  # Cap at 100%

            feature_health_data.append(
                FeatureHealth(
                    feature_id=feature.id,
                    feature_name=feature.name,
                    test_coverage=test_coverage,
                    bug_count=len(bugs),
                    test_pass_rate=test_pass_rate
                )
            )

    return feature_health_data


async def get_organization_health_data(user: UserModel) -> OrganizationHealth:
    """
    Get health metrics for the organization.

    Args:
        user: The current user

    Returns:
        OrganizationHealth object containing organization health metrics
    """
    # Get organizations for the current user
    organizations = await get_organizations_for_user(user.id)

    # Check if user has any organizations
    if not organizations:
        return OrganizationHealth(
            avg_test_coverage=0,
            avg_bug_resolution_time=0,
            overall_health_score=0,
            total_products=0,
            total_features=0,
            total_tests=0,
            total_bugs=0
        )

    # Use the first organization by default
    organization = organizations[0]

    # Get all products for this organization
    products = await ProductModel.filter(organization_id=organization.id)

    # Initialize counters
    total_products = len(products)
    total_features = 0
    total_tests = 0
    total_bugs = 0
    total_bug_resolution_time = 0
    bugs_with_resolution_time = 0

    # Process each product
    for product in products:
        # Get all tests and bugs for this product
        tests = await get_tests_by_product_path(product.url)
        bugs = await get_bugs_by_product_path(product.url)

        total_tests += len(tests)
        total_bugs += len(bugs)

        # Get features count
        product_model = await ProductModel.get(id=product.id).prefetch_related('epics__features')
        for epic in product_model.epics:
            total_features += len(epic.features)

        # Calculate bug resolution time (if status indicates resolution)
        for bug in bugs:
            # This is simplified and assumes a status field indicates resolution
            if bug.status and bug.status.lower() in ["resolved", "closed", "fixed"]:
                # Calculate resolution time (simplified)
                # In a real implementation, you would track when the bug was resolved
                resolution_time = (datetime.now() - bug.detected_at).total_seconds() / 3600  # hours
                total_bug_resolution_time += resolution_time
                bugs_with_resolution_time += 1

    # Calculate averages
    avg_test_coverage = 65.5  # Mocked value, would be calculated from actual test coverage
    avg_bug_resolution_time = (
        total_bug_resolution_time / bugs_with_resolution_time
        if bugs_with_resolution_time > 0 else 0
    )

    # Calculate overall health score (simplified)
    # In a real implementation, this would have a more sophisticated algorithm
    health_factors = [
        avg_test_coverage / 100,  # Scale to 0-1
        1 - min(avg_bug_resolution_time / 168, 1),  # Normalize resolution time (1 week = 168h)
        0.8 if total_bugs < total_tests * 0.1 else 0.4  # Fewer bugs is better
    ]
    overall_health_score = sum(health_factors) / len(health_factors) * 100

    return OrganizationHealth(
        avg_test_coverage=avg_test_coverage,
        avg_bug_resolution_time=avg_bug_resolution_time,
        overall_health_score=overall_health_score,
        total_products=total_products,
        total_features=total_features,
        total_tests=total_tests,
        total_bugs=total_bugs
    )
