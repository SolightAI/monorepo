import * as React from 'react';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import { Box, StepContent } from '@mui/material';
import { Loader2 } from 'lucide-react';


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
  const [activeStep, setActiveStep] = React.useState(0);

  // TODO Add Generation Tests status pooling

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  React.useEffect(() => {
    if (activeStep === steps.length) {
      return;
    }

    const interval = setInterval(() => {
      handleNext();
    }, steps[activeStep].time);

    return () => clearInterval(interval);
  }, [activeStep])

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            {
              index >= activeStep ? (
                <StepLabel
                  StepIconComponent={Loader2}
                  StepIconProps={{
                    className: "animate-spin",
                    active: 'true',
                    error: "false",
                    completed: "false",
                  }}
                >
                  {step.label}
                </StepLabel>
              ) : (
                <StepLabel>{step.label}</StepLabel>
              )
            }
            <StepContent>
              <p>
                {step.description}
              </p>
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