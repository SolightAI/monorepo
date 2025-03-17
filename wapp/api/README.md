# Test Manager API

This is the backend API for the Test Manager Application, built with FastAPI and PostgreSQL. It provides endpoints for managing products, epics, features, tests, bugs, and more.

## Architecture

The API follows a modular architecture with the following components:

### Core Components

- **FastAPI Application**: The main entry point (`main.py`) that initializes the API and includes all routers
- **Endpoints**: API routes organized by resource type in the `endpoints/` directory
- **Services**: Business logic implementation in the `services/` directory
- **Data Models**: Database models using Tortoise ORM in `dto/models.py`
- **Schemas**: Pydantic models for request/response validation in `dto/schemas.py`
- **Database**: PostgreSQL database with Tortoise ORM for data persistence

### Models

The API uses Tortoise ORM to define the following data models:

- **User**: User accounts and authentication information
- **Organization**: Teams or companies that group users
- **OrganizationMember**: Many-to-many relationship between users and organizations
- **Invitation**: Invitation codes for joining organizations
- **Product**: Products being tested, owned by organizations
- **Epic**: Collections of features within a product
- **Feature**: Specific functionality in a product
- **UserStory**: User needs and requirements for features
- **AcceptanceCriteria**: Conditions that must be met for a user story
- **Test**: Test cases for verifying functionality
- **Bug**: Issues discovered during testing
- **Secret**: Encrypted credentials for testing
- **SecretValue**: Individual encrypted values within a secret
- **SecretAccess**: Access logs for secrets

### API Endpoints

The API provides the following endpoints:

- `/auth`: Authentication and user management
  - Login/logout
  - Google OAuth integration
  - Token refresh
  - Authorization checks

- `/organizations`: Organization management
  - Create/read/update/delete organizations
  - Manage organization members
  - Change member roles

- `/invitations`: Organization invitations
  - Create invitation codes
  - Accept invitations
  - List pending invitations

- `/products`: Product management
  - Create/read/update/delete products
  - List products by organization

- `/epics`: Epic management
  - Create/read/update/delete epics
  - List epics by product

- `/features`: Feature management
  - Create/read/update/delete features
  - List features by epic

- `/user-stories`: User story management
  - Create/read/update/delete user stories
  - List user stories by feature

- `/acceptance-criteria`: Acceptance criteria management
  - Create/read/update/delete acceptance criteria
  - List criteria by user story

- `/tests`: Test management
  - Create/read/update/delete tests
  - List tests by acceptance criteria
  - Update test status

- `/bugs`: Bug reporting and tracking
  - Create/read/update/delete bugs
  - List bugs by test or product
  - Update bug status

- `/secrets`: Secret management
  - Create/read/update/delete secrets
  - Access secret values securely
  - List secrets by organization or product

- `/dashboard`: Dashboard data
  - Get aggregate statistics
  - Generate reports

## Authentication and Security

The API uses JWT (JSON Web Tokens) for authentication with the following features:

- Token-based authentication
- Role-based access control
- Google OAuth integration
- Secure password handling
- Encrypted storage of sensitive credentials

## Environment Variables

The API requires the following environment variables:

```
# Database Configuration
POSTGRES_DB=testmanager
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Authentication
JWT_SECRET_KEY=your_jwt_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Secret Encryption
SECRET_ENCRYPTION_KEY=your_secure_encryption_key
SECRET_ENCRYPTION_SALT=your_secure_salt

# Application
APP_URL=http://localhost:3000
```

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/test-manager.git
   cd test-manager/api
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -e .
   ```

4. Create a `.env` file with the required environment variables (see above).

5. Set up the database:
   ```bash
   # Run PostgreSQL (if not using Docker)
   # Example using Docker:
   docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=your_password -e POSTGRES_DB=testmanager postgres:17
   ```

6. Run migrations (using Aerich):
   ```bash
   aerich upgrade
   ```

7. Start the development server:
   ```bash
   uvicorn src.main:app --reload
   ```

The API will be available at http://localhost:8000. The interactive API documentation will be at http://localhost:8000/docs.

## Docker Setup

1. Create a `.env` file with the required environment variables.

2. Build and run using Docker Compose:
   ```bash
   docker-compose up --build
   ```

This will start both the API and PostgreSQL database services. The API will be available at http://localhost:8000.

## Testing

Run the tests using pytest:

```bash
pytest
```

## API Documentation

The API provides self-documenting endpoints using Swagger UI and ReDoc:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Helper Scripts

The API includes several helper scripts:

- `add_successful_tests.py`: Add test results to the database
- `import_bugs.py`: Import bugs from external sources
- `upload_report_to_db.py`: Upload test reports to the database

## Security Considerations

- All sensitive data is encrypted using Fernet symmetric encryption
- Secrets are scoped to organizations and optionally to specific products
- Access to secrets is logged for audit purposes
- Only users with appropriate permissions can create, update, or delete sensitive data
