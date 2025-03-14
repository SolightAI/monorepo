# Link Checker

A comprehensive tool for checking and validating links across websites. This script crawls web pages starting from a specified URL, checking all links for issues such as broken links, redirects to wrong environments, slow responses, and SSL problems.

## Features

- **Comprehensive link checking**: Crawls through websites and checks all links for issues
- **JavaScript support**: Uses Playwright to render JavaScript-heavy pages
- **Concurrent processing**: Checks multiple links simultaneously for efficiency
- **Multiple issue detection**:
  - Broken links (404s and other HTTP errors)
  - Redirects
  - Links to wrong environments
  - SSL certificate issues
  - Mixed content warnings
  - CORS issues
  - Slow responses
- **Detailed reporting**: Generates a comprehensive CSV report of all links checked
- **Health score calculation**: Provides an overall website health percentage

## Requirements

- Python 3.7+
- Playwright
- Dependencies: asyncio, csv, datetime, urllib.parse, enum, typing

## Installation

1. Install the required packages:
   ```bash
   pip install playwright
   ```

2. Install the Playwright browsers:
   ```bash
   playwright install
   ```

## Usage

You can run the script directly with default parameters:

```bash
python verify_links.py
```

Or import and use it in your own scripts:

```python
import asyncio
from verify_links import main

asyncio.run(main(
    start_url="https://example.com",
    output_file="results.csv",
    check_ssl=True,
    slow_response_threshold=5000,
    max_concurrent_checks=5,
    check_slow_response=True
))
```

### Parameters

- `start_url`: The URL where the crawl should begin
- `output_file`: Path where the CSV results should be saved
- `check_ssl`: Whether to check for SSL issues (default: True)
- `slow_response_threshold`: Time in milliseconds after which a response is considered slow (default: 5000)
- `max_concurrent_checks`: Maximum number of links to check concurrently (default: 5)
- `check_slow_response`: Whether to flag slow responses (default: True)

## Output

The script produces a CSV file with the following columns:
- `source_page`: The page where the link was found
- `link_url`: The URL of the link
- `link_text`: The text content of the link
- `status`: Status of the link (OK, BROKEN, REDIRECT, ERROR, etc.)
- `status_code`: HTTP status code
- `final_url`: URL after any redirects
- `css_selector`: CSS selector that can be used to find the link
- `xpath`: XPath that can be used to find the link
- `issue`: Description of any issues found

## Example

```bash
python verify_links.py
```

This will check all links starting from the default URL (https://www.predictiveindex.com/) and save the results to output.csv.

For a custom run:

```python
import asyncio
from verify_links import main

asyncio.run(main(
    start_url="https://example.com",
    output_file="my_results.csv",
    check_ssl=True,
    slow_response_threshold=3000,  # Lower threshold for slow responses
    max_concurrent_checks=10,      # More concurrent checks
    check_slow_response=True
))
```

## Status Types

- `OK`: Link is working correctly
- `BROKEN`: Link is broken (404, etc.)
- `REDIRECT`: Link redirects to another URL
- `ERROR`: Error occurred while checking the link
- `WARNING`: Minor issues detected
- `WRONG_ENVIRONMENT`: Link points to a wrong environment
