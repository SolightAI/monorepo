import { useForm } from "react-hook-form";
import { Card, CardContent, Typography } from "@mui/material";
import { isValidUrl } from "@/utils/urlUtils";
import { useNavigate } from "react-router-dom";
import { useDemo } from "@/context/DemoContext";
import axios from "axios";
import { API_URL } from "@/constants/api";
import { useEffect, useState } from "react";

export function Home() {
  const navigate = useNavigate();
  const { updateUrl, updateFeature, reset } = useDemo();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const form = useForm({
    mode: "all",
    defaultValues: {
      url: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setError(null);

      // Generate tests in a demo setting
      const { data: testsGenerationData } = await axios.post(
        `${API_URL}/demo/tests/generate`,
        {
          url: data.url.trim(),
        },
      );
      console.log("Test generation running", testsGenerationData);

      // Save data to context
      updateUrl(data.url.trim());
      updateFeature(testsGenerationData.feature_id);
      navigate("/demo/processing");
    } catch (error) {
      console.error("Error while initiate test generation", error);
      setError("An error occurred while initiating the test generation. Please try again.");
    }
  };

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <div className="flex flex-col md:max-w-[740px] mx-auto items-center pb-12 pt-24">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
        Solight Demo
      </h1>

      <p className="text-lg text-center text-gray-700 mb-16">  
        Experience the future of advertising with Solight. Our platform
        revolutionizes how ads are integrated into LLM applications, ensuring
        seamless and relevant interactions.
      </p>

      <Card variant="outlined" className="mt-4">
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <Typography variant="h6" gutterBottom>
                Try it out !
              </Typography>
              <Typography variant="body2" paragraph>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tincidunt maximus volutpat. Donec non iaculis leo. Nam in nulla sed dui aliquet volutpat quis feugiat ipsum. Donec id porta arcu, id tempor mauris. Mauris sit amet nisl a est posuere lacinia elementum quis ligula. Integer magna ipsum, volutpat non aliquet non, rhoncus at nulla.
              </Typography>
              <Typography variant="body2" paragraph>
                Processing will take approximately 3–5 minutes
              </Typography>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full flex flex-col gap-4">    
              <div className="flex flex-col gap-2">        
                <label htmlFor="url" className="block text-sm font-medium text-gray-700">Enter your website URL</label>
                <input
                  id="url" 
                  className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  {...form.register("url", {
                    required: "This field is required",
                    validate: (v) => isValidUrl(v.trim()) ? true : "You must enter a valid URL" })
                  }
                  placeholder="https://example.com"
                />
                {form.formState.errors.url && (
                  <span className="text-red-500 text-sm">
                    {form.formState.errors.url.message}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="w-fit flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Preparing generation...' : 'Generate tests'}
              </button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}