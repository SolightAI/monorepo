# Test Manager Application

This is a web application for managing test products, tracking bugs, and organizing the testing workflow. The application follows a hierarchical structure of Products -> Epics -> Features -> User Stories -> Acceptance Criteria -> Tests.

## Architecture

The application is structured as follows:

### Frontend (React)
- **Pages**
  - `Products.js` - Main landing page that lists all products and allows adding new ones
  - `ProductOverview.js` - Detailed view of a product with tests and bugs
  - `Login.js` / `Register.js` - Authentication pages
  - `Settings.js` - User settings
  - `AdminInvitations.js` - Admin only page for invitation management

- **Components**
  - `Layout.js` - The main layout wrapper with navigation
  - `EpicCreationModal.jsx` - Modal for adding epics to a product with AI assistance
  - Various UI components for specific features (TestDetailsModal, BugDetailsModal, etc.)

- **Utils**
  - `auth.js` - Authentication utilities and API calls

### Backend (FastAPI)
- **Models**
  - Product - Top level entity representing a product
  - Epic - A collection of features within a product
  - Feature - Specific functionality in the product
  - UserStory - Description of a user need
  - AcceptanceCriteria - Specific conditions for a user story
  - Test - Actual tests associated with acceptance criteria
  - Bug - Issues detected during testing

- **Services**
  - ProductServices - CRUD operations for products
  - EpicServices - CRUD operations for epics
  - FeatureServices - CRUD operations for features
  - TestServices - Test management and fetching

## Data Flow

1. User creates a Product
2. After creating a product, the user can add Epics:
   - Manually add epics one by one
   - Use AI to automatically generate epics based on product documentation
3. Epics contain Features
4. Features are broken down into User Stories
5. User Stories have Acceptance Criteria
6. Tests are associated with Acceptance Criteria
7. Bugs are linked to Tests

## AI Features

The application includes AI-powered features to improve the user experience:

1. **Epic Generation** - When a product is created with detailed documentation, the user can click "Auto-generate Epics with AI" to have the system automatically suggest epics based on the product description.

## Authentication

The application uses token-based authentication with:
- Username/password login
- Google OAuth integration
- Session management with cookies
- Admin role permissions

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
