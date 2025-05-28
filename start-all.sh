# Script to start all services from the root docker-compose.yaml

# Create the shared network if it doesn't exist yet
if ! docker network inspect api-tm_shared_network &>/dev/null; then
  echo "Creating shared network: api-tm_shared_network"
  docker network create api-tm_shared_network
else
  echo "Shared network already exists"
fi

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file"
  export $(grep -v '^#' .env | xargs)
fi

if [ "$1" = "local-lambda" ]; then
  # Stop any running containers
  echo "Stopping any running containers..."
  docker compose -f local.docker-compose.yaml down
  
  # Start all services
  echo "Starting all services..."
  docker compose -f local.docker-compose.yaml up --build
else
  # Stop any running containers
  echo "Stopping any running containers..."
  docker compose down

  # Start all services
  echo "Starting all services..."
  docker compose up --build
fi



echo "All services started. Use 'docker compose logs -f' to view logs."
echo "Access your services at:"
echo "- React App: http://localhost:3000"
echo "- API: http://localhost:8000"
echo "- Task Manager: http://localhost:8001"
echo "- PgAdmin: http://localhost:8080"
echo "- Weaviate: http://localhost:8081"
echo "- Lambda Webhook: http://localhost:8085"
echo "- Lambda Jobs: http://localhost:8090"
