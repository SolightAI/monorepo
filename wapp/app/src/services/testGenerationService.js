import { triggerFeatureTestGeneration, getTestGenerationStatus } from './testService';
import { TEST_STATUS, formatStatus } from '@/utils/testExecutionUtils';

/**
 * Polls the status of a test generation task.
 * @param {string} featureId - The ID of the feature.
 * @param {Function} onStatusUpdate - Callback for status updates.
 * @param {Function} onSuccess - Callback for successful completion.
 * @param {Function} onError - Callback for errors.
 * @param {string} featureName - The name of the feature.
 * @returns {number} - The interval ID for clearing.
 */
export const pollTestGenerationStatus = (featureId, onStatusUpdate, onSuccess, onError, featureName, demo = false) => {
    const intervalId = setInterval(async () => {
        try {
            const response = await getTestGenerationStatus(featureId, demo);

            const statusMessage = `Test Generation in Progress. Status: ${response.status ? formatStatus(response.status) : formatStatus(TEST_STATUS.PENDING)}${response.progress ? ` (${response.progress})` : ''}`;
            onStatusUpdate(statusMessage);

            if (response.status === TEST_STATUS.PASSED) {
                clearInterval(intervalId);
                try {
                    // Call onSuccess with message
                    onSuccess({
                        message: `Successfully generated tests for feature "${featureName || featureId}". Status: ${formatStatus(TEST_STATUS.PASSED)}`,
                        featureId,
                    });
                } catch (fetchErr) {
                    console.error('Error fetching generated tests:', fetchErr);
                    onError('Tests were generated but could not be retrieved. Please refresh the page.');
                }
            } else if (response.status === TEST_STATUS.ERROR || response.status === TEST_STATUS.FAILED) {
                clearInterval(intervalId);
                onError(response.status === TEST_STATUS.ERROR ? `Error generating tests for feature "${featureName || featureId}". Please try again.` : `Test generation failed for feature "${featureName || featureId}". Please try again.`);
            }
        } catch (pollErr) {
            console.error(`Error polling test generation status for Feature ${featureId}:`, pollErr);
            clearInterval(intervalId);
            onError('Error checking test generation status. Please try again.');
        }
    }, 2000); // Poll every 2 seconds
    return intervalId;
};

/**
 * Handles the logic for triggering and monitoring feature test generation.
 * @param {string} featureId - The ID of the feature to generate tests for.
 * @param {Array} secrets - Array of test credentials. Should not be empty.
 * @param {Array<string>} categories - Array of test categories to generate
 * @param {Function} onStatusUpdate - Callback function for status updates (receives status message).
 * @param {Function} onSuccess - Callback function on successful completion (receives success message).
 * @param {Function} onError - Callback function on error (receives error message).
 * @param {string} featureName - The name of the feature.
 * @returns {Function} - A cleanup function to clear the polling interval.
 */
export const handleFeatureTestGeneration = async (
    featureId,
    secrets,
    categories,
    onStatusUpdate,
    onSuccess,
    onError,
    featureName
) => {
    if (!featureId || featureId === 'all') {
        onError('Please select a specific feature before generating tests.');
        return () => { }; // Return an empty cleanup function
    }

    if (!secrets || secrets.length === 0) {
        onError(
            <span>
                Cannot generate tests: No test credentials found. Please add credentials in the{' '}
                <a href="/test-credentials" className="text-red-800 font-medium underline">
                    Test Credentials Management
                </a>{' '}
                section.
            </span>
        );
        return () => { }; // Return an empty cleanup function
    }

    let pollingIntervalId = null;

    try {
        onStatusUpdate(`Starting test generation for "${featureName || featureId}"...`);

        // Trigger test generation for the feature with categories
        await triggerFeatureTestGeneration(featureId, categories);

        // Start polling using the dedicated function
        pollingIntervalId = pollTestGenerationStatus(
            featureId,
            onStatusUpdate,
            // Wrap onSuccess to clear pollingIntervalId
            (result) => {
                pollingIntervalId = null; // Mark interval as cleared
                onSuccess(result);
            },
            // Wrap onError to clear pollingIntervalId
            (errorMsg) => {
                pollingIntervalId = null; // Mark interval as cleared
                setTimeout(() => window.location.reload(), 2000);
                onError(errorMsg);
            },
            featureName // Pass the feature name to the polling function
        );

    } catch (err) {
        console.error('Error starting test generation:', err);
        // We might not have an intervalId if the initial trigger failed
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        // Pass the specific error message if available
        onError(`Failed to start test generation: ${err.message || 'Please try again.'}`);
    }

    // Return a cleanup function
    return () => {
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
            pollingIntervalId = null;
        }
    };
};
