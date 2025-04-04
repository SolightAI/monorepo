import os
import boto3
import json

from typing import Optional, Literal
from logging import getLogger


logger = getLogger(__name__)


def generate_s3_key(
    task_type: Literal["test", "feature", "epic", "user_story", "acceptance_criteria"],
    task_name: str,
    task_id: str,
) -> str:
    """
    Generate a unique S3 key based on task parameters.

    Args:
        task_type: Type of task (test, feature, etc.)
        task_name: Name of the task

    Returns:
        Formatted S3 key
    """

    # Clean task name for use in path (remove special chars, spaces to underscores)
    clean_name = "".join(c if c.isalnum() else "_" for c in task_name).lower()

    # Base path
    base_path = f"{task_id}/{task_type}_{clean_name}"

    return f"{base_path}.gif"


class S3Manager:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(S3Manager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self._check_and_init_env_vars()
            self._initialized = True

    def _check_and_init_env_vars(self):
        """Check and initialize environment variables and ensure bucket exists"""
        required_vars = {
            'AWS_ACCESS_KEY_ID': os.getenv('AWS_ACCESS_KEY_ID'),
            'AWS_SECRET_ACCESS_KEY': os.getenv('AWS_SECRET_ACCESS_KEY'),
            'S3_BUCKET_NAME': os.getenv('S3_BUCKET_NAME')
        }

        missing_vars = [var for var, value in required_vars.items() if not value]
        if missing_vars:
            raise EnvironmentError(f"Missing required environment variables: {', '.join(missing_vars)}")

        self.bucket_name = required_vars['S3_BUCKET_NAME']
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=required_vars['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=required_vars['AWS_SECRET_ACCESS_KEY'],
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )

        # Ensure bucket exists
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """Create S3 bucket if it doesn't exist"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except self.s3_client.exceptions.ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == '404' or error_code == '403':
                logger.info(f"Bucket {self.bucket_name} does not exist. Creating...")
                region = os.getenv('AWS_REGION', 'us-east-1')
                try:
                    if region == 'us-east-1':
                        self.s3_client.create_bucket(Bucket=self.bucket_name)
                    else:
                        self.s3_client.create_bucket(
                            Bucket=self.bucket_name,
                            CreateBucketConfiguration={'LocationConstraint': region}
                        )
                    logger.info(f"Successfully created bucket {self.bucket_name}")
                except Exception as create_error:
                    logger.error(f"Failed to create bucket: {str(create_error)}")
                    raise
            else:
                logger.error(f"Error checking bucket: {str(e)}")
                raise

    def upload_gif(
        self,
        task_id: str,
        file_path: str,
        task_type: Literal["test", "feature", "epic", "user_story", "acceptance_criteria"],
        task_name: str,
        additional_params: Optional[dict] = None,
    ) -> str:
        """
        Upload a GIF file to S3 bucket with a task-specific key

        Args:
            file_path: Local path to the GIF file
            task_type: Type of task (test, feature, etc.)
            task_name: Name of the task
            additional_params: Additional parameters to include in the key

        Returns:
            str: The URL of the uploaded file
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        s3_key = generate_s3_key(task_type, task_name, task_id)

        try:
            self.s3_client.upload_file(
                file_path,
                self.bucket_name,
                s3_key,
                ExtraArgs={'ContentType': 'image/gif', "Metadata": {k: json.dumps(v) for k, v in additional_params.items()}}
            )

            # Generate the URL for the uploaded file
            url = f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"
            return url

        except Exception as e:
            logger.error(f"Error uploading file to S3: {str(e)}")


def upload_gif_to_s3(
    file_path: str,
    task_id: str,
    task_type: Literal["test", "feature", "epic", "user_story", "acceptance_criteria"],
    task_name: str,
    additional_params: Optional[dict] = None,
) -> Optional[str]:
    """
    Helper function to upload a GIF to S3. Returns None if S3 upload fails.
    """

    if os.getenv("TEST_MODE", "false").lower() == "true":
        logger.info(f"[{task_id}] Skipping S3 upload in test mode")
        return None

    try:
        s3_manager = S3Manager()
        return s3_manager.upload_gif(task_id, file_path, task_type, task_name, additional_params)
    except Exception as e:
        logger.error(f"[{task_id}] Failed to upload GIF to S3: {str(e)}")
        return None
