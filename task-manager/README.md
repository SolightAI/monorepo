# Task Manager

A FastAPI server that generates automated tests based on acceptance criteria.

## Features

- Generate automated tests from acceptance criteria
- Browser automation for authentication
- Support for authentication fixture generation
- API endpoints for test generation

## Requirements

- Python 3.7+
- Docker and Docker Compose (recommended for containerized deployment)
- Azure OpenAI API key for AI-powered test generation

## Project Status

**Important Note**: Only the `fixtures` and `generate_tests` modules are currently up-to-date and maintained. Other components in the codebase are deprecated.

## Setup

### Environment Variables

The following environment variables are required:

```bash
AZURE_OPENAI_KEY=your_openai_key
AZURE_OPENAI_ENDPOINT=your_openai_endpoint
```

### Option 1: Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python src/main.py
```

### Option 2: Docker Deployment

1. Make sure Docker and Docker Compose are installed on your system.

2. Build and start the containers:
```bash
docker-compose -f dev.docker-compose.yaml up -d
```

3. To view logs:
```bash
# All services
docker-compose -f dev.docker-compose.yaml logs -f

# Specific service
docker-compose -f dev.docker-compose.yaml logs -f task-manager
```

4. To stop the containers:
```bash
docker-compose -f dev.docker-compose.yaml down
```

## API Endpoints

- `POST /generate-tests-for-acceptance-criteria`: Generate tests based on acceptance criteria
- `GET /get-test-generation-status/{task_id}`: Get the status of a test generation task

## Architecture

This application uses:
- **FastAPI**: For the REST API endpoints
- **Browser-Use**: For browser automation and authentication
- **Azure OpenAI**: For AI-powered test generation
- **Weaviate**: Vector database for RAG (optional, configured in Docker setup)

### Core Components

1. **Test Generation Module** (`src/generate_tests/`)
   - Generates automated tests from acceptance criteria using AI
   - Supports various test categories

2. **Authentication Fixtures** (`src/fixtures/`)
   - Provides utilities for generating authenticated sessions
   - Can be used for testing authenticated applications

## Development

The test generation functionality is designed to be integrated with task management systems. It can generate test scripts based on product information, epics, features, user stories, and acceptance criteria.
