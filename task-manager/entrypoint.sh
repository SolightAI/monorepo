#!/bin/bash

# exit if error
set -e

# Run install_dependencies.sh
source ./install_dependencies.sh

cd src

# Add current directory to PYTHONPATH
export PYTHONPATH=$PYTHONPATH:.

# Run the application
# exec uvicorn main:app --host 0.0.0.0 --port 8001 --reload
exec fastapi run --workers ${WORKERS:-1} main.py --host 0.0.0.0 --port 8001
