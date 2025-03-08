# Jira Action API

A FastAPI server that handles Jira issue actions with support for long-running jobs.

## Features

- Trigger jobs from Jira actions
- Support for long-running jobs (up to 10 minutes or more)
- Persistent job processing with Celery
- Get job results

## Requirements

- Python 3.7+
- Redis (for Celery message broker)
- Docker and Docker Compose (optional, for containerized deployment)

## Setup

### Option 1: Local Development

1. Install Redis:
   - macOS: `brew install redis`
   - Ubuntu: `sudo apt install redis-server`
   - Or use Docker: `docker run -d -p 6379:6379 redis`

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Start Redis (if not already running):
```bash
redis-server
```

4. Start the Celery worker:
```bash
./run_worker.sh
```

5. Run the server:
```bash
./run_server.sh
```

### Option 2: Docker Deployment

1. Make sure Docker and Docker Compose are installed on your system.

2. Build and start the containers:
```bash
docker-compose up -d
```

3. To view logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f worker
```

4. To stop the containers:
```bash
docker-compose down
```

## API Endpoints

- `POST /api/jobs`: Trigger a new job
- `GET /api/jobs/{job_id}`: Get the result of a specific job

## Architecture

This application uses:
- **FastAPI**: For the REST API endpoints
- **Celery**: For processing long-running jobs
- **Redis**: As the message broker and result backend for Celery

## Testing

You can test the API using the provided test script:
```bash
python test_api.py
```

With Docker:
```bash
# Make sure the containers are running
docker-compose exec web python test_api.py
```

## Development

This server is designed to be integrated with Jira issue actions. The Celery worker handles long-running jobs, ensuring they continue processing even if the web server restarts. 