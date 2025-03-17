# Bug Reporting and Management System

A comprehensive application for managing software testing, bug reporting, and team collaboration. This system is designed to help software teams organize their products, track features, document user stories, define acceptance criteria, manage tests, and report bugs.

## Project Architecture

### Backend (FastAPI)

The backend is built with FastAPI, a modern Python web framework for building APIs. Key components include:

- **Data Models**:
  - `User`: Manages user accounts and authentication
  - `Organization`: Groups users in teams with shared access to resources
  - `OrganizationMember`: Manages the many-to-many relationship between users and organizations
  - `Invitation`: Handles invitations for joining organizations
  - `Product`: Represents software products that belong to organizations
  - `Epic`: Organizes related features within a product
  - `Feature`: Defines specific functionality implemented in a product
  - `UserStory`: Describes user needs and requirements for features
  - `AcceptanceCriteria`: Defines conditions that must be met for a user story
  - `Test`: Documents test cases related to acceptance criteria
  - `Bug`: Reports issues discovered during testing
  - `Secret`: Stores encrypted credentials and sensitive data for testing
  - `SecretValue`: Contains individual encrypted values within a secret
  - `SecretAccess`: Logs access to secrets for audit purposes
  - `TestSecret`: Maps secrets to specific tests that use them

- **API Endpoints**:
  - `/auth`: Authentication and user management
  - `/organizations`: Organization management and member administration
  - `/invitations`: Managing invitations to join organizations
  - `/products`: Product management
  - `/epics`: Epic management
  - `/features`: Feature management
  - `/user-stories`: User story management
  - `/acceptance-criteria`: Acceptance criteria management
  - `/tests`: Test management
  - `/bugs`: Bug reporting and tracking
  - `/secrets`: Secret management for test credentials
  - `/dashboard`: Dashboard data and analytics

- **Services**:
  - Business logic layer implementing domain-specific operations
  - Authentication services with JWT support
  - Organization and membership services
  - Product hierarchy services
  - Secret management and encryption services

### Frontend (React)

The frontend is built with React, using modern patterns and practices:

- **Pages**:
  - `Dashboard.jsx`: Main dashboard with overview of products and organizations
  - `product/`: Pages related to product management
  - `auth/`: Authentication pages (Login, Register)
  - `admin/`: Admin only pages for system management
  - `organization/`: Organization management pages
  - `user/`: User settings and profile pages
  - Various other feature-specific pages

- **State Management**:
  - Context-based state management for organization and product data
  - Local component state for UI interactions

- **Components**:
  - Layout components with responsive design
  - Organization management and selector components
  - Product management and selector components
  - Navigation and breadcrumb components
  - Form components for data entry
  - Modal components for operations that need user attention

- **Services**:
  - API service modules for communication with the backend

### Multi-tenant Architecture

The application implements a multi-tenant architecture where:

1. **User Authentication**: Users must authenticate to access the system
2. **Organization Membership**: Users must belong to at least one organization
3. **Resource Ownership**: Products and their hierarchical components belong to specific organizations
4. **Access Control**: Users' access to resources is determined by their role within an organization
5. **Data Isolation**: Organizations can only access their own data

## Organization Feature

The organization feature enables:

- **Team Management**: Create and manage organizations with multiple members
- **Role-Based Access**: Assign different roles (owner, admin, member, guest) to control permissions
- **Resource Sharing**: Share products and testing resources within an organization
- **Member Invitations**: Invite new users to join an organization with specific roles
- **Organization Switching**: Users can belong to multiple organizations and switch between them

## Authentication Flow

1. **Regular Registration**:
   - User registers with email and password
   - User is redirected to create or join an organization
   - Once part of an organization, user can access the application

2. **Invitation Registration**:
   - User receives an invitation link with a code
   - User registers with the invitation code
   - User automatically joins the organization specified in the invitation
   - User can immediately access the application

## Secret Management

The system includes a secure secrets management feature to handle sensitive credentials and data for testing:

### Features

- **Encrypted Storage**: All secret values are encrypted using Fernet symmetric encryption
- **Organization Scoping**: Secrets are scoped to organizations and optionally to specific products
- **Role-Based Access**: Only users with owner/admin roles can create, update, or delete secrets
- **Audit Logging**: All access to secrets is logged for security and compliance
- **Test Integration**: Tests can reference secrets for credentials without exposing sensitive data

### Secret Types

- Username/password pairs for test accounts
- API keys and tokens
- Environment variables
- Connection strings
- OAuth credentials

## Getting Started

### Backend Setup

1. Install Python dependencies:
   ```
   cd api
   pip install -r requirements.txt
   ```

2. Set up environment variables:
   - Create a `.env` file with necessary configuration

3. Run database migrations:
   ```
   aerich upgrade
   ```

4. Start the backend server:
   ```
   uvicorn src.main:app --reload
   ```

### Frontend Setup

1. Install dependencies:
   ```
   cd app
   npm install
   ```

2. Set up environment variables:
   - Create a `.env` file with API URL and other configurations

3. Start the development server:
   ```
   npm start
   ```

## Docker Deployment

The application can be deployed using Docker:

```bash
# For backend
cd api
docker build -t test-manager-api .
docker run -p 8000:8000 test-manager-api

# For frontend
cd app
docker build -t test-manager-app .
docker run -p 3000:80 test-manager-app
```

You can also use docker-compose:

```bash
docker-compose -f dev.docker-compose.yaml up
```
