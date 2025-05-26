from typing import cast

from unittest.mock import Mock

from src.common.webhook_client import WebhookClient


def mock_webhook_client() -> WebhookClient:
    mock_webhook_client = cast(WebhookClient, Mock(spec=WebhookClient))

    mock_webhook_client.send_success = _mock_send_success
    mock_webhook_client.send_error = _mock_send_error

    return mock_webhook_client


empty_response = Mock()
empty_response.status_code = 200
empty_response.json.return_value = {}


def _mock_send_success(job_id, result):
    print(f"Sending success for job {job_id}: {result}")
    return empty_response


def _mock_send_error(job_id, error):
    print(f"Sending error for job {job_id}: {error}")
    return empty_response
