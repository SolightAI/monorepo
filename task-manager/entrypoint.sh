#!/bin/bash

# Exit on any error
set -e

echo "==== Starting Task Manager entrypoint script ===="

# Verify Python installation
if ! command -v python &> /dev/null; then
    echo "Error: Python is not installed or not in PATH"
    exit 1
fi

echo "Python version: $(python --version)"

# Verify uvicorn installation
if ! python -c "import uvicorn" &> /dev/null; then
    echo "Error: uvicorn package is not installed"
    exit 1
fi

echo "uvicorn package is available"

# Source dependencies installation script
echo "==== Installing dependencies ===="
source /app/install_dependencies.sh

# Change to source directory
echo "==== Changing to source directory ===="
cd src

# Start the server using Python's module system
echo "==== Starting uvicorn server ===="
exec python -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
