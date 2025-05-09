import * as React from 'react';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import { Box, StepContent } from '@mui/material';
import { Loader2, X } from 'lucide-react';
import { useDemo } from '@/context/DemoContext';
import { useNavigate } from 'react-router-dom';
import { pollTestGenerationStatus } from '@/services/testGenerationService';
import { getTestGenerationStatus } from '@/services/testService';
import { TEST_STATUS } from '@/utils/testExecutionUtils';


const steps = [
  {
    label: 'Preparing Test Generation',
    description: `Initializing environment and retrieving inputs needed to begin the test creation process`,
    time: 20_000,
  },
  {
    label: 'Scanning Website Structure',
    description: "Mapping out the site's layout and identifying key pages, elements, and user flows",
    time: 45_000,
  },
  {
    label: 'Detecting Functional Elements',
    description: `Finding interactive components like buttons, forms, and navigation links to test for functionalit.`,
    time: 60_000,
  },
  {
    label: ' Generating Test Scenarios',
    description: `Creating user journey simulations to cover key actions`,
    time: 70_000,
  },
  {
    label: 'Reviewing and Finalizing Output',
    description: `Validating tests for coverage and quality before packaging them for delivery`,
    time: 45_000,
  },
];

function ProgressStepper() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = React.useState(0);
  const [error, setError] = React.useState(null);
  const [isGeneratingTests, setIsGeneratingTests] = React.useState(true);
  const { feature, reset } = useDemo();
  const generationPollingIntervalRef = React.useRef(null); // Polling interval for test generation

  // Add the checkExistingTaskId function
  const checkExistingTaskId = async () => {
    if (!feature) return;

    try {
      try {
        // Use feature ID to check task-manager status
        const statusData = await getTestGenerationStatus(feature.id);

        if (statusData && statusData.status === TEST_STATUS.PENDING) {
          setIsGeneratingTests(true);
        } else if (statusData && statusData.status === 'error') {
          // Clear any existing polling interval
          if (generationPollingIntervalRef.current) {
            clearInterval(generationPollingIntervalRef.current);
            generationPollingIntervalRef.current = null;
          }
          setIsGeneratingTests(false);
          setError(`Test generation failed: ${statusData.error}`);
        } else if (statusData && statusData.status === 'unknown') {
          // Clear any existing polling interval
          if (generationPollingIntervalRef.current) {
            clearInterval(generationPollingIntervalRef.current);
            generationPollingIntervalRef.current = null;
          }
          setIsGeneratingTests(false);
        } else {
          setIsGeneratingTests(false);
          console.log('No ongoing test generation found in task-manager');
        }
      } catch (taskError) {
        console.error('Error checking task-manager status:', taskError);
        // If we get a 404, it means no task is running
        if (taskError.response && taskError.response.status === 404) {
          console.log('No task found in task-manager');
          setIsGeneratingTests(false);
        } else {
          // For other errors, we'll assume there might be a task running
          console.log('Assuming task might be running due to error');
          setIsGeneratingTests(true);
          // Start polling with the feature ID
          startDemoTestGenerationPolling();
        }
      }
    } catch (error) {
      console.error('Error checking existing task ID:', error);
      setError('Error checking test generation status. Please try again.');
      setIsGeneratingTests(false);
    }
  };
  // Update the startTestGenerationPolling function
  const startDemoTestGenerationPolling = async () => {
    if (!feature) return;
  
    try {
      // Clear any existing polling interval
      if (generationPollingIntervalRef.current) {
        clearInterval(generationPollingIntervalRef.current);
      }

      // Set initial states
      setError(null);

      // Use the pollTestGenerationStatus function from the service
      generationPollingIntervalRef.current = pollTestGenerationStatus(
        feature.id,
        (_) => { // onStatusUpdate
          return;
        },
        async () => { // onSuccess
          setIsGeneratingTests(false);
          generationPollingIntervalRef.current = null;
          handleNext();
          setTimeout(() => navigate('/demo/results'), 2000);
        },
        (errorMsg) => { // onError
          setIsGeneratingTests(false);
          generationPollingIntervalRef.current = null;
          setError(`Test generation failed. ${errorMsg}`);
        },
        feature.name
      );
    } catch (error) {
      console.error('Error starting test generation polling:', error);
      setIsGeneratingTests(false);
      setError('Error starting test generation. Please try again.');
    }
  };
  
  // Update the useEffect to use checkExistingTaskId
  React.useEffect(() => {
    let isMounted = true;
    let checkTimeout = null;

    const initialize = async () => {
      if (!isMounted) return;

      if (!feature) {
        navigate('/demo', { replace: true });
        return;
      }

      startDemoTestGenerationPolling();
      // Then check for existing task ID in the background
      await checkExistingTaskId();
    };

    // Use a smaller timeout to ensure the component is fully mounted
    checkTimeout = setTimeout(() => {
      initialize();
    }, 50);

    // Cleanup function
    return () => {
      isMounted = false;
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
      if (generationPollingIntervalRef.current) {
        clearInterval(generationPollingIntervalRef.current);
        generationPollingIntervalRef.current = null;
      }
    };
  }, [feature, navigate]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  React.useEffect(() => {
    if (activeStep === steps.length - 1) {
      return;
    }

    if (!isGeneratingTests || error) {
      return;
    }

    const interval = setInterval(() => {
      handleNext();
    }, steps[activeStep].time);

    return () => clearInterval(interval);
  }, [activeStep, isGeneratingTests, error])

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            {
              index >= activeStep ? (
                <StepLabel
                  StepIconComponent={isGeneratingTests ? Loader2 : error ? X : undefined}
                  StepIconProps={isGeneratingTests ? {
                    className: "animate-spin",
                    active: 'true',
                    error: "false",
                    completed: "false",
                  } : {
                    className: "text-red-500",
                    active: 'false',
                    error: "true",
                    completed: "false",
                  }}
                >
                  <p>{step.label}</p>
                </StepLabel>
              ) : (
                <StepLabel>{step.label}</StepLabel>
              )
            }
            <StepContent>
              <div className='flex flex-col gap-2'>
                <p>
                  {step.description}
                </p>
                {error && index === activeStep ? (
                  <>
                    <p className='text-sm text-red-500'>{error}</p>
                    <button
                      className="w-fit flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                      onClick={() => {
                        reset();
                        navigate('/demo', { replace: true });
                      }}
                    >
                      Go back
                    </button>
                  </>
                ) : null}
              </div>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}

export function Processor() {
  return (
    <div className="grid grid-cols-2 -order-1 md:order-1 grow gap-4">
      {/* Left section */}
      <div className="col-span-2 md:col-span-1 flex flex-col gap-8 py-12 px-6 sm:px-12">
        <h2 className="text-2xl">Generating tests for your website</h2>
        <ProgressStepper />
      </div>
      
      {/* Right section  */}
      <div className="col-span-2 md:col-span-1 items-center flex flex-col gap-4 py-12 bg-blue-500">
        <iframe 
          width="500"
          height="415"
          className="w-full max-w-[700px] aspect-[1.77]"
          src="https://www.youtube.com/embed/kyqpSycLASY?si=B9UinO_OWMQfG_QM"
          title="YouTube video player"
          frameBorder="0"
          allow="encrypted-media; gyroscope; autoplay;" 
          referrerPolicy="strict-origin-when-cross-origin">
        </iframe>
      </div>
    </div>
  )
}