import os
import boto3
import json
import mimetypes

from typing import Optional
from logging import getLogger


logger = getLogger(__name__)


class S3Manager:
    _instance = None
    _initialized = False

    def __new__(cls) -> 'S3Manager':
        if cls._instance is None:
            cls._instance = super(S3Manager, cls).__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if not self._initialized:
            self._check_and_init_env_vars()
            self._initialized = True

    def _check_and_init_env_vars(self) -> None:
        """Check and initialize environment variables and ensure bucket exists"""
        required_vars = {
            'AWS_ACCESS_KEY_ID': os.getenv('AWS_ACCESS_KEY_ID'),
            'AWS_SECRET_ACCESS_KEY': os.getenv('AWS_SECRET_ACCESS_KEY'),
            'S3_BUCKET_NAME': os.getenv('S3_BUCKET_NAME'),
            'AWS_ENDPOINT_URL': os.getenv('AWS_ENDPOINT_URL')
        }

        missing_vars = [var for var, value in required_vars.items() if not value]
        if missing_vars:
            raise EnvironmentError(f"Missing required environment variables: {', '.join(missing_vars)}")

        self.bucket_name = required_vars['S3_BUCKET_NAME']
        self.endpoint_url = required_vars['AWS_ENDPOINT_URL']
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=required_vars['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=required_vars['AWS_SECRET_ACCESS_KEY'],
            region_name=os.getenv('AWS_REGION', 'us-east-1'),
            endpoint_url=required_vars['AWS_ENDPOINT_URL']
        )

        # Ensure bucket exists
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self) -> None:
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

    def exists(
        self,
        object_name: str,
    ) -> bool:
        """
        Check if a file exists in S3.
        """

        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=object_name)
            return True
        except Exception:
            return False

    def download_file(
        self,
        object_name: str,
        output_path: str,
    ) -> Optional[str]:
        """
        Download a file from S3.
        """
        try:
            self.s3_client.download_file(
                Bucket=self.bucket_name,
                Key=object_name,
                Filename=output_path
            )
            return output_path
        except Exception as e:
            logger.error(f"Error downloading file from S3: {str(e)}")
            raise

    def upload_file(
        self,
        file_path: str,
        object_name: str,
        additional_params: Optional[dict] = None,
        content_type: Optional[str] = None,
    ) -> str:
        """
        Upload a file to S3 bucket with a task-specific key

        Args:
            job_id: ID of the task
            file_path: Local path to the file
            task_type: Type of task (test, feature, etc.)
            task_name: Name of the task
            additional_params: Additional parameters to include in the key as Metadata
            content_type: MIME type of the file. If None, it will be guessed.

        Returns:
            str: The URL of the uploaded file
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        # Determine content type if not provided
        if content_type is None:
            content_type, _ = mimetypes.guess_type(file_path)
            if content_type is None:
                content_type = 'application/octet-stream'

        try:
            extra_args = {'ContentType': content_type}
            if additional_params:
                extra_args["Metadata"] = {k: json.dumps(v) for k, v in additional_params.items()}

            self.s3_client.upload_file(
                file_path,
                self.bucket_name,
                object_name,
                ExtraArgs=extra_args
            )

            # URL of the uploaded file
            return f"{self.endpoint_url}/{self.bucket_name}/{object_name}"

        except Exception as e:
            logger.error(f"Error uploading file to S3: {str(e)}")
            raise


def upload_file_to_s3(
    file_path: str,
    object_name: str,
    additional_params: Optional[dict] = None,
    content_type: Optional[str] = None,
) -> Optional[str]:
    """
    Helper function to upload a file to S3. Returns None if S3 upload fails or in test mode.
    """

    if os.getenv("TEST_MODE", "false").lower() == "true":
        logger.info("Skipping S3 upload in test mode")
        return None

    try:
        s3_manager = S3Manager()
        return s3_manager.upload_file(
            file_path=file_path,
            object_name=object_name,
            additional_params=additional_params,
            content_type=content_type,
        )
    except Exception as e:
        logger.error(f"Failed to upload file to S3: {str(e)}")
        return None


def exists_in_s3(
    object_name: str,
) -> bool:
    """
    Check if a file exists in S3.
    """
    return S3Manager().exists(object_name=object_name)


def download_file_from_s3(
    object_name: str,
    output_path: str,
) -> Optional[str]:
    """
    Download a file from S3.
    """
    s3_manager = S3Manager()
    return s3_manager.download_file(
        object_name=object_name,
        output_path=output_path,
    )
