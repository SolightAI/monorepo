import logging
import mimetypes
import json
import os
from typing import Any, Dict, Optional


import boto3

logger = logging.getLogger(__name__)


class S3Client:
    bucket_name: str
    endpoint_url: str
    client: Any

    def __init__(
        self,
        access_key_id: str,
        secret_access_key: str,
        bucket_name: str,
        bucket_endpoint_url: str,
        region: str = "us-east-1",
    ) -> None:
        """
        Initialize the S3 client and create the bucket if it doesn't exist.

        Args:
            access_key_id: AWS access key ID
            secret_access_key: AWS secret access key
            bucket_name: Name of the S3 bucket
            bucket_endpoint_url: Endpoint URL of the S3 bucket
            region: Region of the S3 bucket (default is "us-east-1")
        """
        self.bucket_name = bucket_name
        self.endpoint_url = bucket_endpoint_url
        self.client = boto3.client(
            "s3",
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region,
            endpoint_url=bucket_endpoint_url,
        )

        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self) -> None:
        """
        Create S3 bucket if it doesn't exist.
        """

        try:
            self.client.head_bucket(Bucket=self.bucket_name)
        except self.client.exceptions.ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")

            if error_code == "404" or error_code == "403":
                logger.info(f"Bucket {self.bucket_name} does not exist. Creating...")
                region = self.client.meta.region_name

                try:
                    if region == "us-east-1":
                        self.client.create_bucket(Bucket=self.bucket_name)
                    else:
                        self.client.create_bucket(
                            Bucket=self.bucket_name,
                            CreateBucketConfiguration={"LocationConstraint": region},
                        )

                    logger.info(f"Successfully created bucket {self.bucket_name}")
                except Exception as e:
                    logger.error(f"Failed to create bucket: {str(e)}")
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
            self.client.head_object(Bucket=self.bucket_name, Key=object_name)
            return True
        except Exception:
            return False

    def download_file(
        self,
        object_name: str,
        output_path: str,
        overwrite_bucket: str | None = None,
    ) -> Optional[str]:
        """
        Download a file from S3.
        """

        try:
            self.client.download_file(
                Bucket=self.bucket_name
                if overwrite_bucket is None
                else overwrite_bucket,
                Key=object_name,
                Filename=output_path,
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
                content_type = "application/octet-stream"

        try:
            extra_args: Dict[str, Any] = {"ContentType": content_type}
            if additional_params:
                extra_args["Metadata"] = {
                    k: json.dumps(v) for k, v in additional_params.items()
                }  # type: ignore

            self.client.upload_file(
                file_path, self.bucket_name, object_name, ExtraArgs=extra_args
            )
            
            logger.info(f"Uploaded file to S3: {self.endpoint_url}/{self.bucket_name}/{object_name}")

            # URL of the uploaded file
            return f"{self.endpoint_url}/{self.bucket_name}/{object_name}"

        except Exception as e:
            logger.error(f"Error uploading file to S3: {str(e)}")
            raise
