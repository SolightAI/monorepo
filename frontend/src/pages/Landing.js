import React from 'react';
import { Check, Send } from 'lucide-react';
import { Chatbot } from '../components/Chatbot/Chatbot';

const APP_URL = process.env.REACT_APP_APP_URL;


const Card = ({ className, children, ...props }) => (
  <div className={`bg-white p-4 rounded-lg shadow-lg ${className}`} {...props}>
    {children}
  </div>
);

const CardHeader = ({ children }) => <div className="mb-2">{children}</div>;
const CardTitle = ({ className, children }) => <h3 className={`text-xl font-bold ${className}`}>{children}</h3>;
const CardContent = ({ children }) => <div>{children}</div>;
const CardFooter = ({ children }) => <div className="mt-4">{children}</div>;


const FeaturesSection = () => {
  return (
    <section className="w-full py-8 md:py-16 lg:py-20 bg-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">3 Steps to Monetize Your LLM</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Seamlessly integrate relevant ads into your AI conversations and start generating revenue from your LLM applications.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl items-center gap-8 py-12 md:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <PencilIcon className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-xl font-bold mb-2">1. Quick Integration</h3>
            <p className="text-muted-foreground">
              Add our SDK to your LLM application with just a few lines of code.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <BoltIcon className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-xl font-bold mb-2">2. Smart Ad Placement</h3>
            <p className="text-muted-foreground">
              Our AI automatically identifies optimal moments for contextual ad insertion.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <CheckIcon className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-xl font-bold mb-2">3. Start Earning</h3>
            <p className="text-muted-foreground">
              Monitor your earnings and optimize ad performance through our dashboard.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}


function BoltIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  )
}

function CheckIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function PencilIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}


const Pricing = ({ title, price, features, url, buttonText = "Get Started", isEnterprise = false }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-center">
          {isEnterprise ? (
            <span className="text-3xl font-bold">Custom</span>
          ) : (
            <>
              <span className="text-3xl font-bold">${price}</span>
              <span className="text-gray-500">/month</span>
            </>
          )}
        </div>
        <ul className="space-y-1 text-gray-500 text-sm">
          {features.map((feature, index) => (
            <li key={index}>
              <Check className="mr-2 inline-block h-4 w-4" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <a
          href={url}
          className="w-full inline-flex h-10 items-center justify-center rounded-md bg-blue-500 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:pointer-events-none disabled:opacity-50"
        >
          {buttonText}
        </a>
      </CardFooter>
    </Card>
  );
};


const PricingSection = () => {
  return (
    <section id="pricing" className="w-full py-8 md:py-16 lg:py-20 bg-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Flexible Pricing</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Scale your revenue as your AI application grows.
            </p>
          </div>
        </div>
        <div className="mx-auto grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:max-w-5xl">
          <Pricing
            title='Starter'
            price={0}
            url={`${APP_URL}/register`}
            features={['Up to 10k monthly conversations', 'Basic ad targeting', 'Standard support', 'Basic analytics']}
          />
          <Pricing
            title='Growth'
            price={299}
            url={`${APP_URL}/register`}
            features={['Up to 100k monthly conversations', 'Advanced ad targeting', 'Priority support', 'Advanced analytics']}
          />
          <Pricing
            title="Enterprise"
            features={[
              "Unlimited conversations",
              "Custom ad integration",
              "Dedicated account manager",
              "White-label solution"
            ]}
            url={`${APP_URL}/register`}
            buttonText="Contact Sales"
            isEnterprise={true}
          />
        </div>
      </div>
    </section>
  );
};


// const MessageBox = () => {
//   return (
//     <div className="flex items-center p-4 bg-white rounded-md shadow-md">
//       <input
//         type="text"
//         placeholder="Hey! Tell me about space exploration"
//         className="flex-1 p-2 border border-gray-300 rounded-md"
//       />
//       <button className="ml-2 bg-blue-500 text-white rounded-md px-4 py-2 flex items-center">
//         Generate Video
//         <Send className="ml-1 h-4 w-4" />
//       </button>
//     </div>
//   )
// };


// const OverlappingImages = () => {
//   return (
//     <div className="relative w-full max-w-2xl mx-auto">

//       {/* Main image container */}
//       <div className="relative ml-20 rounded-lg overflow-hidden">
//         <img
//           src="https://i.ibb.co/j41TYY0/Group-1686561153.png"
//           alt="Space exploration scene"
//           className="w-full h-auto"
//         />
//       </div>

//       {/* Overlapping chat bubble */}
//       <div className="absolute top-16 left-0 rounded-lg p-4 max-w-s transform -rotate-6 origin-top-left">
//         <MessageBox className="w-full h-auto" />
//       </div>

//     </div>
//   );
// };

const OverlappingImages = () => {
  return (
    <div className="relative w-full mx-auto">
      <img
        src="https://i.ibb.co/zHJGGd5/laneo-phone.png"
        alt="Space exploration scene"
        className="w-full h-auto"
      />
    </div>
  );
};


const PresentationSection = () => {
  return (
    <section className="w-full pt-4 md:pt-8 lg:pt-12">
      <div className="container mx-auto space-y-12 px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">

          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                Monetize Your AI Chat with Seamless Ad Integration
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                Transform your LLM application into a revenue stream. Our platform intelligently integrates ads into AI conversations while maintaining user experience.
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <a
                href={`${APP_URL}/register`}
                className="inline-flex bg-blue-500 text-white h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                Start Monetizing
              </a>
            </div>
          </div>

          < OverlappingImages/>

        </div>
      </div>
    </section>
  );
};

const DemoSection = () => {
  return (
    <section id="samples" className="w-full py-8 md:py-16 lg:py-20 bg-gray-50">
      <div className="container mx-auto space-y-12 px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">

            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gray-900">
              See How It Works
            </h2>

            <p className="max-w-[900px] text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Watch how our platform seamlessly integrates ads into AI conversations.
            </p>

            <div className="max-w-3xl mx-auto h-[500px] pt-8">
              <Chatbot />
            </div>

          </div>
        </div>

        {/* Video demo */}
        {/* <div className="flex justify-center w-full h-full">
          <div className="w-full max-w-3xl aspect-video">
            <iframe
              width="896"
              height="440"
              className="w-full rounded-lg shadow-lg"
              src="https://www.youtube.com/embed/magINhPM9vk"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div> */}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
              <div className="w-full aspect-video bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};


export default function VideoPlatform() {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center">
        <img src="https://i.ibb.co/rv8yHK6/laneo-black.png" alt="Laneo" className="h-6 w-6" />
        <span className="text-lg font-semibold ml-2">Laneo</span>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <a href="#features" className="text-sm font-medium hover:underline underline-offset-4" onClick={(e) => {
            e.preventDefault();
            scrollToSection('features');
          }}>
            Features
          </a>
          <a href="#samples" className="text-sm font-medium hover:underline underline-offset-4" onClick={(e) => {
            e.preventDefault();
            scrollToSection('samples');
          }}>
            Demo
          </a>
          {/* <a href="#pricing" className="text-sm font-medium hover:underline underline-offset-4" onClick={(e) => {
            e.preventDefault();
            scrollToSection('pricing');
          }}>
            Pricing
          </a> */}
        </nav>
      </header>

      <main className="flex-1">

        <PresentationSection />

        <FeaturesSection />

        <DemoSection />

        {/* <PricingSection /> */}

      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500">&copy; 2024 Laneo. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          {/* Footer navigation links can be added here if needed */}
        </nav>
      </footer>
    </div>
  );
}
