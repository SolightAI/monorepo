#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Apply database migrations
echo "Applying database migrations..."
aerich upgrade

# Start the FastAPI application
echo "Starting FastAPI application..."
exec fastapi run --workers ${WORKERS:-1} src/main.py --host 0.0.0.0 --port 8000
