# Monorepo

This repository contains multiple microservices that can be launched together or separately.

## Quick Start

To launch all services at once:

1. Copy the environment file template and customize it if needed:
   ```
   cp .env.example .env
   ```

2. Run the start script:
   ```
   ./start-all.sh
   ```

This will:
- Create the shared Docker network if it doesn't exist
- Load environment variables from your `.env` file
- Start all services using Docker Compose

## Access Services

After starting, you can access your services at:
- React App: http://localhost:3000
- API: http://localhost:8000
- Task Manager: http://localhost:9000
- PgAdmin: http://localhost:8080
- Weaviate: http://localhost:8081

## Starting Individual Services

If you prefer to start services individually:

- For the web app and API:
  ```
  cd wapp
  docker compose -f local.docker-compose.yaml up -d
  ```

- For the task manager and Weaviate:
  ```
  cd task-manager
  docker compose -f local.docker-compose.yaml up -d
  ```

## Managing Services

- View logs for all services:
  ```
  docker compose logs -f
  ```

- Stop all services:
  ```
  docker compose down
  ```

- Remove all containers and volumes:
  ```
  docker compose down -v
  ```
