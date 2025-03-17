# Test Manager Application

This is a web application for managing test products, tracking bugs, and organizing the testing workflow. The application follows a hierarchical structure of Products -> Epics -> Features -> User Stories -> Acceptance Criteria -> Tests.

## Architecture

The application is structured as follows:

### Frontend (React)
- **Pages**
  - `Dashboard.jsx` - Main dashboard with overview of products and organizations
  - `product/` - Pages related to product management
  - `auth/` - Authentication pages (Login, Register)
  - `admin/` - Admin only pages for system management
  - `organization/` - Organization management pages
  - `user/` - User settings and profile pages

- **Components**
  - Various UI components organized by feature
  - Layout components for consistent UI structure
  - Modal components for operations that need user attention

- **Context**
  - State management using React Context API
  - Organization and product context providers

- **Services**
  - API service modules for communication with the backend

- **Utils**
  - Utility functions for authentication, formatting, etc.

### Backend (FastAPI)
- **Models**
  - User - User account information
  - Organization - Represents a team or company
  - OrganizationMember - Manages user membership in organizations
  - Invitation - Manages invitations to join organizations
  - Product - Top level entity representing a product
  - Epic - A collection of features within a product
  - Feature - Specific functionality in the product
  - UserStory - Description of a user need
  - AcceptanceCriteria - Specific conditions for a user story
  - Test - Actual tests associated with acceptance criteria
  - Bug - Issues detected during testing
  - Secret - Manages encrypted credentials for testing
  - SecretValue - Individual encrypted values within a secret
  - SecretAccess - Logs access to secrets for audit purposes

- **API Endpoints**
  - `/auth` - Authentication endpoints
  - `/organizations` - Organization management
  - `/invitations` - Invitation management
  - `/products` - Product management
  - `/epics` - Epic management
  - `/features` - Feature management
  - `/user-stories` - User story management
  - `/acceptance-criteria` - Acceptance criteria management
  - `/tests` - Test management
  - `/bugs` - Bug reporting and tracking
  - `/secrets` - Secret management for test credentials
  - `/dashboard` - Dashboard data endpoints

- **Services**
  - Business logic implementation for all major features

## Data Flow

1. User creates a Product within an Organization
2. After creating a product, the user can add Epics:
   - Manually add epics one by one
   - Use AI to automatically generate epics based on product documentation
3. Epics contain Features
4. Features are broken down into User Stories
5. User Stories have Acceptance Criteria
6. Tests are associated with Acceptance Criteria
7. Bugs are linked to Tests

## Organization Features

The application supports multi-tenant architecture with organizations:
- Create and manage organizations
- Invite members with different roles (owner, admin, member, guest)
- Associate products with specific organizations
- Role-based access control for resources

## Secret Management

The system includes secure secrets management for handling sensitive test credentials:
- Encrypted storage of secret values
- Organization and product scoping
- Role-based access control
- Audit logging for compliance
- Integration with tests

## Authentication

The application uses token-based authentication with:
- Username/password login
- Session management
- Role-based permissions
- Invitation-based registration

## Getting Started

1. Install dependencies: `npm install`
2. Start the development server: `npm start`
3. The application will be available at http://localhost:3000

## Environment Variables

- `REACT_APP_API_URL` - Backend API URL (defaults to http://localhost:8000)

## Deployment

The application can be deployed using the provided Dockerfile:

```bash
docker build -t test-manager .
docker run -p 3000:80 test-manager
```
