# Epic-Level "Generate All" Implementation TODO

## Summary of Progress

The implementation of the "Generate All" feature has been completed:

- ✅ Backend: Unified generation service and endpoint for all scope levels
- ✅ Frontend: Reusable hook and components for tracking generation progress
- ✅ Frontend: Integration with EpicDetails.js for epic-level generation
- ✅ Frontend: Integration with ProductDetails.js for product-level generation

Remaining tasks:
- ❌ Write automated tests for both backend and frontend
- ❌ Document the feature in the project documentation

## Simplified Architecture

1. Create a unified generation endpoint: [COMPLETED]
   - Path: `/api/generation/full`
   - Query parameters:
     - `scope`: "feature", "epic", or "product"
     - `id`: UUID of the feature, epic, or product
   - Single endpoint handles feature-level, epic-level, and product-level generation
   - Implementation approach: 
     - Created new module `services/generation_service.py`
     - Reused existing background task pattern from feature/test generation
     - Followed similar API pattern to other generation endpoints

2. Use FastAPI background tasks: [COMPLETED]
   - Leveraged existing FastAPI background task functionality
   - No additional infrastructure like Redis/Celery needed
   - In-memory task state tracking implemented

3. Standardize progress tracking: [COMPLETED]
   ```json
   {
     "status": "in_progress|completed|failed",
     "task_id": "uuid",
     "scope": "product|epic|feature",
     "current_item": {
       "index": 2,
       "total": 5,
       "id": "feature-uuid",
       "name": "Feature Name",
       "stage": "user_stories|acceptance_criteria|tests",
       "progress": 65
     },
     "completed_items": [{"id": "...", "name": "..."}],
     "errors": [{"item_id": "...", "message": "..."}]
   }
   ```

## Backend Implementation

1. Create core generation service: [COMPLETED]
   - `services/generation_service.py`
   - Functions:
     - `trigger_full_generation(scope, id)`: Main entry point
     - `generate_all_for_feature(feature_id)`: Handle feature-level generation
     - `generate_all_for_epic(epic_id)`: Coordinate multiple feature generations
     - `generate_all_for_product(product_id)`: Coordinate all epics and features

2. Add status tracking endpoint: [COMPLETED]
   - `/api/generation/status/{task_id}`
   - Single endpoint for retrieving generation status regardless of scope

## Frontend Improvements [COMPLETED]

1. Create reusable React hook: [COMPLETED]
   - `hooks/useGenerationStatus.js`
   - Handles polling, error states, and provides consistent interface
   - Example usage:
   ```js
   const { status, progress, isLoading, error } = useGenerationStatus(taskId, scope);
   ```

2. Create shared generation progress component: [COMPLETED]
   - `components/GenerationProgressModal.js`
   - Configurable to show appropriate detail level for feature/epic/product
   - Progress visualization with completion percentages
   - Basic error display

3. Update existing components: [COMPLETED]
   - Update `EpicDetails.js` to add "Generate All" button and use shared components [COMPLETED]
   - Add "Generate All" button to `ProductDetails.js` for complete product generation [COMPLETED]
   - Create a new dedicated `ProductDetails.js` page with the "Generate All" button [COMPLETED]

## Error Handling [COMPLETED]

1. Implement basic error handling:
   - If one feature fails, continue with others
   - Track which items succeeded/failed
   - Display errors in the UI without retry options

2. Error display:
   - Show which features encountered errors
   - Display basic error messages
   - Option to restart the full generation process

## Implementation Phases

1. Phase 1: Backend infrastructure [COMPLETED]
   - Basic endpoint structure
   - Status tracking

2. Phase 2: Feature-level refactoring [COMPLETED]
   - Move logic from FeatureDetails.js to backend
   - Implement feature-level generation service

3. Phase 3: Epic-level implementation [COMPLETED]
   - Implement epic-level generation service
   - Add "Generate All" to EpicDetails.js [COMPLETED]

4. Phase 4: Product-level implementation [COMPLETED]
   - Implement product-level generation service [COMPLETED]
   - Add "Generate All" to ProductDetails.js [COMPLETED]

## Testing Strategy [PENDING]

1. Unit tests:
   - Core generation services
   - Status tracking

2. Integration tests:
   - End-to-end generation workflows for all scopes
   - Error cases

3. UI tests:
   - Progress display
   - Error presentation 