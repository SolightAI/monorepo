# Task Manager

A FastAPI server that generates automated tests based on acceptance criteria.

```mermaid
flowchart LR

    Router:::gpt-4.1-mini --> SignupAgentCheck["is Agent able to run test"]:::gpt-4.1-mini
    Router:::gpt-4.1-mini --> LoginAgentCheck["is Agent able to run test"]:::gpt-4.1-mini
    Router:::gpt-4.1-mini --> GeneralAgentCheck["is Agent able to run test"]:::gpt-4.1-mini

    subgraph SignupAgentRouting["Signup Agent"]
      SignupAgentCheck --> SignupAgent["Agent"]:::gpt-4.1
      SignupAgent --> SignupHealthCheck["HealthChecks"]:::gpt-4.1-mini
    end

    subgraph LoginAgentRouting["Login Agent"]
      LoginAgentCheck --> LoginAgent["Agent"]:::gpt-4.1
      LoginAgent --> LoginHealthCheck["HealthChecks"]:::gpt-4.1-mini
    end

    subgraph GeneralAgentRouting["General Agent"]
      GeneralAgentCheck --> GeneralAgent["Agent"]:::gpt-4.1
      GeneralAgent --> GeneralHealthCheck["HealthChecks"]:::gpt-4.1-mini
    end

    SignupHealthCheck --> CheckResult["Check Result"]:::gpt-4.1
    LoginHealthCheck --> CheckResult["Check Result"]:::gpt-4.1
    GeneralHealthCheck --> CheckResult["Check Result"]:::gpt-4.1

    %% Legend
    subgraph Legend ["Models"]
        l1["gpt-4.1-mini"]:::gpt-4.1-mini
        l2["gpt-4.1"]:::gpt-4.1
    end

    %% Style definitions
    classDef gpt-4.1-mini fill:#E6F7FF,stroke:#1890FF,color:#000;
    classDef gpt-4.1 fill:#FFF1F0,stroke:#FF4D4F,color:#000;
```

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

## Acceptance Criteria Generation API

### Generate Acceptance Criteria

```
POST /generate-acceptance-criteria/
```

Triggers acceptance criteria generation for a feature.

**Request Body:**
```json
{
  "product": {
    "url": "https://example.com",
    "name": "Product Name",
    "description": "Product Description",
    "documentation": "Product Documentation",
    "links_to_documentation": ["https://docs.example.com"]
  },
  "epic": {
    "name": "Epic Name",
    "description": "Epic Description"
  },
  "feature": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "urls": ["https://example.com/feature"],
    "name": "Feature Name",
    "description": "Feature Description",
    "dependents": [],
    "dependencies": []
  },
  "user_stories": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "name": "User Story Name",
      "description": "User Story Description"
    }
  ],
  "encrypted_secrets": {
    "...": "..."
  }
}
```

**Response:**
- Task ID (string)

**Status Codes:**
- `200 OK`: Request successful, generation started
- `400 Bad Request`: Invalid input
- `500 Internal Server Error`: Server error during generation

### Check Generation Status

```
GET /generate-acceptance-criteria/status/{task_id}
```

Checks the status of an acceptance criteria generation task.

**Parameters:**
- `task_id` (path): Task ID returned from the generation request

**Response:**
```json
{
  "status": "pending|completed|error",
  "results": [
    {
      "title": "Acceptance Criteria Title",
      "description": "Detailed description of the acceptance criteria"
    }
  ],
  "error": "Error message if status is error"
}
```

**Status Codes:**
- `200 OK`: Request successful
- `404 Not Found`: Task not found
- `500 Internal Server Error`: Server error during status check
