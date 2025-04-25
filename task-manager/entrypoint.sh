#!/bin/bash

# exit if error
set -e

# Run install_dependencies.sh
source ./install_dependencies.sh

cd src

# Add current directory to PYTHONPATH
export PYTHONPATH=$PYTHONPATH:.

# Run the application
exec python main.py
