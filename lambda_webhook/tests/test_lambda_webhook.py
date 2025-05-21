import pytest


from fastapi.testclient import TestClient
from .conftest import insert_job, verify_key


@pytest.mark.asyncio
async def test_lambda_success(webhook_client: TestClient):
    """
    Test that the lambda webhook endpoint returns a 200 status code and
    correctly handle a valid job.
    """
    # Insert a job in the redis store
    job_id = "valid-id"
    insert_job(job_id, "in_progress")

    # Send a POST request to the webhook endpoint
    response = webhook_client.post(
        "/lambda-webhook",
        json={"status": "success", "job_id": job_id, "result": "test-result"},
    )

    assert response.status_code == 200
    verify_key(job_id, "success", "test-result")


@pytest.mark.asyncio
async def test_lambda_error(webhook_client: TestClient):
    """
    Test that the lambda webhook endpoint returns a 500 status code and
    correctly handle a job with an error.
    """
    # Insert a job in the redis store
    job_id = "valid-id"
    insert_job(job_id, "in_progress")

    # Send a POST request to the webhook endpoint
    response = webhook_client.post(
        "/lambda-webhook",
        json={"status": "error", "job_id": job_id, "result": "test-result"},
    )

    assert response.status_code == 200
    verify_key(job_id, "error", "test-result")


@pytest.mark.asyncio
async def test_lambda_unknown_key(webhook_client: TestClient):
    """
    Test that the lambda webhook endpoint returns a 404 status code and
    correctly handle an unknown job.
    """
    # Send a POST request to the webhook endpoint
    response = webhook_client.post(
        "/lambda-webhook",
        json={"status": "success", "job_id": "unknown-id", "result": "test-result"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Job unknown-id not found"}


@pytest.mark.asyncio
async def test_lambda_job_already_completed(webhook_client: TestClient):
    """
    Test that the lambda webhook endpoint returns a 400 status code and
    correctly handle a job that is already completed.
    """
    # Insert a job in the redis store
    job_id = "valid-id"
    insert_job(job_id, "success")

    # Send a POST request to the webhook endpoint
    response = webhook_client.post(
        "/lambda-webhook",
        json={"status": "success", "job_id": job_id, "result": "test-result"},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Job valid-id is not in progress ; status is success"
    }
