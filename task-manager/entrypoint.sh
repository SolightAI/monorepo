#!/bin/bash

# exit if error
set -e

# Run install_dependencies.sh
source ./install_dependencies.sh

cd src

# Run the application
exec fastapi run src/main.py --host 0.0.0.0 --port 8001
