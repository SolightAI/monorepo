#!/bin/bash

# exit if error
set -e

# Run install_dependencies.sh
source ./install_dependencies.sh

cd src

# Add current directory to PYTHONPATH
export PYTHONPATH=$PYTHONPATH:.

# Run the application
if [ "${DEV_MODE}" = "true" ]; then
  echo "Running in development mode with reload"
  exec fastapi dev --reload main.py --host 0.0.0.0 --port 8001
else
  exec fastapi run --workers ${WORKERS:-1} main.py --host 0.0.0.0 --port 8001
fi
