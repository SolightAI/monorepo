# Responsiveness Analysis Tool

## Overview

This internal product automates the evaluation of website responsiveness with a focus on mobile viewports (specifically the iPhone 14 Pro Max). It leverages a combination of browser automation and large language models (LLMs) to:

- Retrieve and analyze the DOM of target websites.
- Detect and describe visual responsiveness issues.
- Capture screenshots of highlighted issues.
- Verify the identified issues using multiple image validations.
- Generate comprehensive reports in markdown format.

## Features

- **DOM Analysis:**
  Retrieves the full webpage DOM and processes it (removes `<script>`, `<iframe>`, and `<svg>` content) to feed into LLMs for issue detection.

- **Issue Detection and Deduplication:**
  Utilizes language models (e.g., ChatOpenAI, AzureChatOpenAI, and ChatAnthropic) to identify responsiveness issues and deduplicate them through additional LLM prompts.

- **Screenshot Capture & Verification:**
  Uses a headless browser to take screenshots of the detected issues. Each screenshot is verified through multiple iterations to ensure that the issue is visualized correctly.

- **Automated Report Generation:**
  Compiles the validated issues from JSON outputs into a detailed markdown report, summarizing the issues found on each webpage.

- **Agent-Based Architecture:**
  Built atop the `browser-use` agent framework, the system coordinates between DOM analysis, automated actions, and the LLM interactions, logging all operations and telemetry for further analysis.

## Requirements

- **Python Version:**
  Python 3.11+

- **Environment Variables:**
  - `AZURE_OPENAI_ENDPOINT`
  - `AZURE_OPENAI_KEY`
  - `CHROME_INSTANCE_PATH`
  - `COOKIES_FILE`

- **Dependencies:**
  See the `requirements.txt` (if available) or install dependencies such as:
  - `requests`
  - `pydantic`
  - `langchain_openai`, `langchain_anthropic`
  - Other related internal packages (e.g., `browser_use`)

## Usage

1. **Evaluate Website Responsiveness:**
   Run the main script to analyze a list of predefined webpages. This script will query the DOM, detect issues, take screenshots, and store the outputs in the `outputs/` folder.
   ```bash
   python responsiveness.py
   ```

2. **Generate Report:**
   Once the responsiveness analysis is complete and the JSON outputs are saved in the `outputs/` directory, generate a markdown report by executing:
   ```bash
   python create_report.py
   ```
   The report will be saved as `outputs/report.md`.

## TODOS / Bugs / Fixes in Progress

- **Deduplication of Issues:**
  The current approach runs multiple analyses on the DOM to increase issue detection reliability. Further refinement is needed to prevent redundant issue reporting.

- **Screenshot Verification Logic:**
  The mechanism to verify if the screenshot accurately reflects the detected issue uses multiple verifications. Optimizations are required to reduce processing time and handle edge cases (e.g., skipped tasks).

- **Error Handling & Retry Logic:**
  While network and LLM invocation failures are partly handled, a more robust retry strategy is in progress to mitigate transient errors (such as rate limits or parsing issues).

- **LLM Response Parsing:**
  Enhancements are planned to better parse and validate the JSON responses from LLMs to reduce the instances of parsing exceptions.

## Additional Information

- **Internal Use Only:**
  This tool is designed for internal evaluation of website responsiveness and should not be distributed externally.

- **Extensible Architecture:**
  The modular design allows for easy integration with different language models and browser technologies as needed.
