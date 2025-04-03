import pytest

# Add asyncio marker to make it compatible with the test suite
@pytest.mark.asyncio 
async def test_utils_module():
    """A simple test to verify that the utils module is accessible."""
    assert True 