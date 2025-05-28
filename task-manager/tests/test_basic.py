import os
import requests
import pytest
import logging
import subprocess
import json
import tempfile

from time import time
from uuid import uuid4
from test_auth_session import valid_username_password_credentials


logger = logging.getLogger(__name__)


@pytest.fixture
def task_id() -> str:
    """Generate a unique task ID for each test."""
    return str(uuid4())


def create_playwright_script() -> str:
    """Create a temporary script file for running playwright sessions."""
    script = """
import asyncio
import sys
import json
import os
import sys

sys.path.append(os.path.join(os.path.abspath("./"), "src"))
from fixtures.authentification.get_auth_session import get_auth_session

async def main():
    task_id = sys.argv[1]
    url = sys.argv[2]
    secrets = json.loads(sys.argv[3])

    try:
        await get_auth_session(
            task_id=task_id,
            url=url,
            secrets=secrets,
            reuse_session=False
        )
        print(f"Session {task_id} completed successfully")
        return True
    except Exception as e:
        print(f"Session {task_id} failed: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    asyncio.run(main())
"""
    temp_script = tempfile.NamedTemporaryFile(suffix='.py', mode='w+', delete=False)
    temp_script.write(script)
    temp_script.flush()
    return temp_script.name


@pytest.mark.asyncio
async def test_use_playwright_in_parallel(task_id: str, playground_base_url: str, valid_username_password_credentials: dict) -> None:
    """Test authentication with valid username/password on the simple login page using subprocesses."""

    url = f"{playground_base_url}/auth/email_password/simple"

    response = requests.get(url)
    assert response.status_code == 200, f"Failed to connect to {url}"

    # Number of parallel sessions to create
    before_start = time()
    num_sessions = 5

    # Create the temporary script file
    script_path = create_playwright_script()

    try:
        # Convert credentials to JSON string
        secrets_json = json.dumps(valid_username_password_credentials)

        # Start subprocesses
        processes = []
        logger.info(f"Starting {num_sessions} parallel Playwright sessions for URL: {url}")

        for i in range(num_sessions):
            session_id = f"{task_id}-{i}"

            # Run the process and capture output
            process = subprocess.Popen(
                ["python", script_path, session_id, url, secrets_json],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            processes.append((i, process))

        for i, process in processes:
            stdout, stderr = process.communicate()
            exit_code = process.returncode

            if exit_code != 0:
                logger.warning(f"Session {i} failed: {stderr.strip()}")

            assert "Failed to connect to socket" not in stdout.strip(), f"Session {i} failed: {stdout.strip()}"
            assert "Failed to connect to socket" not in stderr.strip(), f"Session {i} failed: {stderr.strip()}"

    finally:
        # Clean up the temporary script file
        if os.path.exists(script_path):
            os.unlink(script_path)

    execution_time = time() - before_start
    assert execution_time > 3, f"Test took only {execution_time} seconds to run, something is wrong"
