import { useForm } from "react-hook-form";
import { Card, CardContent, Typography } from "@mui/material";
import { isValidUrl } from "@/utils/urlUtils";
import { useNavigate } from "react-router-dom";
import { useDemo } from "@/context/DemoContext";
// import { useAuth } from '@/context/AuthContext';
import { useOrganization } from "@/context/OrganizationContext";
import axios from "axios";
import { API_URL } from "@/constants/api";
import { getAllEpics } from "@/services/productService";
import { triggerFeatureTestGeneration } from "@/services/testService";
import { useEffect, useState } from "react";

// const DEMO_ACCOUNT_EMAIL = process.env.REACT_APP_DEMO_EMAIL || "";
// const DEMO_ACCOUNT_TOKEN = process.env.REACT_APP_DEMO_TOKEN || "";

export function Home() {
  const navigate = useNavigate();
  const { updateUrl, updateFeature, updateEpic, updateProduct, updateOrganization, reset } = useDemo();
  // const { login: authLogin, logout, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { createOrganization } = useOrganization();
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
      
      // ! TODO Should be done so we can use demo account instead of using
      // ! current user logged in account
      // Logout if user is logged in 
      // if (isAuthenticated) {
      //   await logout();
      // }
      // Get token from demo account
      // await authLogin({
      //   email: DEMO_ACCOUNT_EMAIL,
      //   password: DEMO_ACCOUNT_TOKEN,
      // });
      
      // Create new organization
      const org = await createOrganization({
        name: "demo", // TODO Set default name in .env
        description: "Demo organization for Solight",
        type: "education",
      });

      console.log("Organization created:", org);

      // Create new product "default"

      const productData = {
        name: 'default',
        url: data.url,
        description: 'Demo product for Solight',
        documentation: '',
        organization_id: org.id,
      };

      const product = (await axios.post(
        `${API_URL}/products/`,
        productData,
        { withCredentials: true }
      )).data;

      console.log("Product created:", product);

      /// Get default epic
      const epicsData = await getAllEpics(product.id, org.id);

      if (epicsData.length === 0) {
        console.error("No epics found for the product");
        throw new Error("No epics found for the product");
      }
      
      const defaultEpic = epicsData[0];
    
      // Create new feature "default"
      const { data: feature } = await axios.post(
        `${API_URL}/features/`,
        {
          name: 'default',
          description: "Demo feature for Solight",
          epic_id: defaultEpic.id,
          urls: [data.url],
          access_conditions: {
            must_be_logged_in: false,
          },
        },
        { withCredentials: true }
      );
      console.log("Feature created:", feature);

      // Run the test generation for feature "default"
      await triggerFeatureTestGeneration(feature.id);
      
      // Save data to context
      updateUrl(data.url.trim());
      updateOrganization(org);
      updateProduct(product);
      updateEpic(defaultEpic);
      updateFeature(feature);      
      
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