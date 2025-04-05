#!/bin/bash

# exit if error
set -e

# Run install_dependencies.sh
source ./install_dependencies.sh

# Run the application
exec uvicorn main:app --host 0.0.0.0 --port 9000 --reload
