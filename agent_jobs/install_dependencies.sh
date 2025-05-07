#!/bin/bash

# exit if error
set -e

# Set PLAYWRIGHT_BROWSERS_PATH to /opt/bin/playwright-browsers only if not already set
if [ -z "$PLAYWRIGHT_BROWSERS_PATH" ]; then
  export PLAYWRIGHT_BROWSERS_PATH="/opt/bin/playwright-browsers"
  echo "Setting PLAYWRIGHT_BROWSERS_PATH to $PLAYWRIGHT_BROWSERS_PATH"
else
  echo "Using existing PLAYWRIGHT_BROWSERS_PATH: $PLAYWRIGHT_BROWSERS_PATH"
fi

# Create the directory if it doesn't exist
mkdir -p $PLAYWRIGHT_BROWSERS_PATH

# Install Playwright if browsers are not already installed
if [ ! -d "$PLAYWRIGHT_BROWSERS_PATH/chromium_headless_shell-1161" ]; then
  echo "==== Installing Playwright browsers to $PLAYWRIGHT_BROWSERS_PATH ===="
  pip install playwright
  playwright install --with-deps
else
  echo "==== Playwright browsers already installed in $PLAYWRIGHT_BROWSERS_PATH ==== "
  pip install playwright
fi

# Give rights to the user to use the all Playwright binary
chmod -R 755 $PLAYWRIGHT_BROWSERS_PATH
