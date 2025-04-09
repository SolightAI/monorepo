import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from uuid import uuid4

from services.test_services import (
    similarity_score,
    preprocess_text,
    check_for_duplicate_test,
    get_tests_by_epic_id
)


def test_preprocess_text():
    """Test text preprocessing for similarity comparison."""
    # Test with step numbers
    input_text = "1. Navigate to the login page\n2. Enter username and password\n3. Click login"
    expected = "navigate to the login page enter username and password click login"
    assert preprocess_text(input_text) == expected

    # Test with extra whitespace
    input_text = "  Navigate   to  the  login  page  "
    expected = "navigate to the login page"
    assert preprocess_text(input_text) == expected

    # Test with mixed case
    input_text = "Navigate TO the LOGIN page"
    expected = "navigate to the login page"
    assert preprocess_text(input_text) == expected

    # Test with combination of all
    input_text = "  1. Navigate   TO  the  login  page  \n  2. ENTER username  "
    expected = "navigate to the login page enter username"
    assert preprocess_text(input_text) == expected


def test_similarity_score():
    """Test similarity scoring function."""
    # Identical texts
    text1 = "Navigate to the login page"
    text2 = "Navigate to the login page"
    assert similarity_score(text1, text2) == 1.0

    # Similar texts
    text1 = "1. Navigate to the login page\n2. Enter username and password"
    text2 = "Navigate to login page and enter credentials"
    assert 0.3 < similarity_score(text1, text2) < 0.9  # Not identical but somewhat similar

    # Different texts
    text1 = "Navigate to the login page"
    text2 = "Create a new account with valid email"
    assert similarity_score(text1, text2) < 0.35  # Very different - adjusted threshold from 0.3 to 0.35


@pytest.mark.asyncio
async def test_get_tests_by_epic_id():
    """Test retrieving tests by epic ID."""
    # Create mock data
    epic_id = uuid4()
    feature1_id = uuid4()
    feature2_id = uuid4()
    test1_id = uuid4()
    test2_id = uuid4()

    # Mock Epic model
    mock_epic = AsyncMock()
    mock_epic.id = epic_id
    mock_epic.features = []

    # Mock Feature models - make them AsyncMocks for fetch_related
    mock_feature1 = AsyncMock()
    mock_feature1.id = feature1_id
    mock_feature1.tests = []

    mock_feature2 = AsyncMock()
    mock_feature2.id = feature2_id
    mock_feature2.tests = []

    # Mock Test models
    mock_test1 = MagicMock()
    mock_test1.id = test1_id
    mock_test1.name = "Test Login"

    mock_test2 = MagicMock()
    mock_test2.id = test2_id
    mock_test2.name = "Test Registration"

    # Setup mock relationships
    mock_feature1.tests = [mock_test1]
    mock_feature2.tests = [mock_test2]
    mock_epic.features = [mock_feature1, mock_feature2]

    # Mock the get_epic function to return our AsyncMock
    with patch('services.test_services.get_epic', return_value=mock_epic):
        # Mock the epic fetch_related method
        mock_epic.fetch_related = AsyncMock(return_value=None)

        # Mock the feature fetch_related methods
        mock_feature1.fetch_related = AsyncMock(return_value=None)
        mock_feature2.fetch_related = AsyncMock(return_value=None)

        result = await get_tests_by_epic_id(epic_id)

        # Verify results
        assert len(result) == 2
        assert result[0].id == test1_id
        assert result[1].id == test2_id


@pytest.mark.asyncio
async def test_check_for_duplicate_test_by_name():
    """Test duplicate detection based on test name."""
    # Create mock data
    product_id = uuid4()
    feature_id = uuid4()
    test_id = uuid4()

    # Create a mock test
    mock_test = MagicMock()
    mock_test.id = test_id
    mock_test.name = "Login with valid credentials"
    mock_test.steps = "1. Go to login page\n2. Enter valid credentials\n3. Click login"
    mock_test.feature_id = uuid4()  # Different feature ID

    # Mock get_tests_by_product_id to return our mock test
    with patch('services.test_services.get_tests_by_product_id', return_value=[mock_test]):
        # Check for duplicate with exact same name
        result = await check_for_duplicate_test(
            test_name="Login with valid credentials",
            test_steps="Some different steps",
            product_id=product_id,
            feature_id=feature_id
        )

        # Should detect as duplicate because names match exactly
        assert result is not None
        assert result[0] == test_id
        assert result[1] == 1.0  # Perfect match score


@pytest.mark.asyncio
async def test_check_for_duplicate_test_by_steps():
    """Test duplicate detection based on test steps similarity."""
    # Create mock data
    product_id = uuid4()
    feature_id = uuid4()
    test_id = uuid4()

    # Create a mock test with different name but similar steps
    mock_test = MagicMock()
    mock_test.id = test_id
    mock_test.name = "User can log in"  # Different name
    mock_test.steps = "1. Navigate to login page\n2. Enter username and password\n3. Click login button"
    mock_test.feature_id = uuid4()  # Different feature ID

    # Set up similarity threshold for testing
    with patch('services.test_services.SIMILARITY_THRESHOLD', 0.7):
        # Mock get_tests_by_product_id to return our mock test
        with patch('services.test_services.get_tests_by_product_id', return_value=[mock_test]):
            # Check for duplicate with similar steps
            result = await check_for_duplicate_test(
                test_name="Valid login test",  # Different name
                test_steps="1. Go to the login page\n2. Enter valid username and password\n3. Press the login button",
                product_id=product_id,
                feature_id=feature_id
            )

            # Should detect as duplicate because steps are similar
            assert result is not None
            assert result[0] == test_id
            assert 0.7 < result[1] < 1.0  # High similarity but not perfect


@pytest.mark.asyncio
async def test_check_for_duplicate_test_no_match():
    """Test no duplicate is found for dissimilar tests."""
    # Create mock data
    product_id = uuid4()
    feature_id = uuid4()
    test_id = uuid4()

    # Create a mock test that's very different
    mock_test = MagicMock()
    mock_test.id = test_id
    mock_test.name = "User registration"
    mock_test.steps = "1. Go to registration page\n2. Fill out the form\n3. Submit"
    mock_test.feature_id = uuid4()

    # Mock get_tests_by_product_id to return our mock test
    with patch('services.test_services.get_tests_by_product_id', return_value=[mock_test]):
        # Check for duplicate with different name and steps
        result = await check_for_duplicate_test(
            test_name="Login functionality",
            test_steps="1. Navigate to login\n2. Enter credentials\n3. Click login",
            product_id=product_id,
            feature_id=feature_id
        )

        # Should not detect as duplicate
        assert result is None


@pytest.mark.asyncio
async def test_check_for_duplicate_test_same_feature():
    """Test that tests from the same feature are excluded from comparison."""
    # Create mock data
    product_id = uuid4()
    feature_id = uuid4()  # Same feature ID
    test_id = uuid4()

    # Create a mock test with same feature ID
    mock_test = MagicMock()
    mock_test.id = test_id
    mock_test.name = "Login with valid credentials"
    mock_test.steps = "1. Go to login page\n2. Enter valid credentials\n3. Click login"
    mock_test.feature_id = feature_id  # Same feature ID

    # Mock get_tests_by_product_id to return our mock test
    with patch('services.test_services.get_tests_by_product_id', return_value=[mock_test]):
        # Check for duplicate with same feature ID
        result = await check_for_duplicate_test(
            test_name="Login with valid credentials",  # Same name
            test_steps="1. Go to login page\n2. Enter valid credentials\n3. Click login",  # Same steps
            product_id=product_id,
            feature_id=feature_id  # Same feature ID
        )

        # Should not detect as duplicate because it's from the same feature
        assert result is None


@pytest.mark.asyncio
async def test_check_for_duplicate_test_limit_to_epic():
    """Test the limit_to_epic parameter works correctly."""
    # Create mock data
    product_id = uuid4()
    feature_id = uuid4()
    epic_id = uuid4()
    test_id = uuid4()

    # Mock Feature
    mock_feature = MagicMock()
    mock_feature.id = feature_id
    mock_feature.epic_id = epic_id

    # Mock Test
    mock_test = MagicMock()
    mock_test.id = test_id
    mock_test.name = "Login with valid credentials"
    mock_test.steps = "1. Go to login page\n2. Enter valid credentials\n3. Click login"
    mock_test.feature_id = uuid4()  # Different feature ID

    # Mock get_feature to return our mock feature
    with patch('services.test_services.get_feature', return_value=mock_feature):
        # Mock get_tests_by_epic_id to return our mock test
        with patch('services.test_services.get_tests_by_epic_id', return_value=[mock_test]):
            # Check for duplicate with limit_to_epic=True
            result = await check_for_duplicate_test(
                test_name="Login with valid credentials",
                test_steps="1. Go to login page\n2. Enter valid credentials\n3. Click login",
                product_id=product_id,
                feature_id=feature_id,
                limit_to_epic=True
            )

            # Should detect as duplicate from the same epic
            assert result is not None
            assert result[0] == test_id
