from .env import get_bool, get_string


class Config:
    test_aws_lambda_validate_url_endpoint: str | None
    dev_mode: bool
    prod_aws_lambda_queue_trigger_access_key: str | None
    prod_aws_lambda_queue_trigger_secret_key: str | None
    prod_aws_lambda_queue_url: str | None

    def __init__(
        self,
        test_aws_lambda_validate_url_endpoint: str | None,
        dev_mode: bool,
        prod_aws_lambda_queue_trigger_access_key: str | None,
        prod_aws_lambda_queue_trigger_secret_key: str | None,
        prod_aws_lambda_queue_url: str | None,
    ) -> None:
        self.test_aws_lambda_validate_url_endpoint = (
            test_aws_lambda_validate_url_endpoint
        )
        self.dev_mode = dev_mode
        self.prod_aws_lambda_queue_trigger_access_key = (
            prod_aws_lambda_queue_trigger_access_key
        )
        self.prod_aws_lambda_queue_trigger_secret_key = (
            prod_aws_lambda_queue_trigger_secret_key
        )
        self.prod_aws_lambda_queue_url = prod_aws_lambda_queue_url


def get_config() -> Config:
    dev_mode = get_bool("DEV_MODE", False)

    # If dev, we're triggering the lambda through a local HTTP endpoint
    test_aws_lambda_validate_url_endpoint = get_string(
        "TEST_AWS_LAMBDA_VALIDATE_URL_ENDPOINT", None, dev_mode
    )

    # If production, we're triggering the lambda through SQS
    prod_aws_lambda_queue_trigger_access_key = get_string(
        "PROD_AWS_LAMBDA_QUEUE_TRIGGER_ACCESS_KEY", None, not dev_mode
    )
    prod_aws_lambda_queue_trigger_secret_key = get_string(
        "PROD_AWS_SQS_LAMBDA_QUEUE_TRIGGER_SECRET_ACCESS_KEY", None, not dev_mode
    )
    prod_aws_lambda_queue_url = get_string(
        "PROD_AWS_LAMBDA_QUEUE_URL", None, not dev_mode
    )

    return Config(
        test_aws_lambda_validate_url_endpoint,
        dev_mode,
        prod_aws_lambda_queue_trigger_access_key,
        prod_aws_lambda_queue_trigger_secret_key,
        prod_aws_lambda_queue_url,
    )
