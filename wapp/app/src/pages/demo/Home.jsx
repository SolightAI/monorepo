import { useForm } from "react-hook-form";
import { Card, CardContent, Typography } from "@mui/material";
import { isValidUrl } from "@/utils/urlUtils";
import { useNavigate } from "react-router-dom";

export function Home() {
  const navigate = useNavigate();
  const form = useForm({
    mode: "all",
    defaultValues: {
      url: "",
    },
  }); // <{ url: string; }>

  const onSubmit = (data) => {
    console.log(data);
    navigate("/demo/processing");;
  };

  return (
    <div className="flex flex-col md:max-w-[740px] mx-auto items-center py-12">
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
          <Typography variant="h6" gutterBottom>
            Try it out !
          </Typography>
          <Typography variant="body2" paragraph>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tincidunt maximus volutpat. Donec non iaculis leo. Nam in nulla sed dui aliquet volutpat quis feugiat ipsum. Donec id porta arcu, id tempor mauris. Mauris sit amet nisl a est posuere lacinia elementum quis ligula. Integer magna ipsum, volutpat non aliquet non, rhoncus at nulla.
          </Typography>
          <Typography variant="body2" paragraph>
            Processing will take approximately 3–5 minutes
          </Typography>
        
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full flex flex-col gap-4">    
            <div className="flex flex-col gap-2">        
              <label htmlFor="url" className="block text-sm font-medium text-gray-700">Enter your website URL</label>
              <input
                id="url" 
                className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                {...form.register("url", {
                  required: "This field is required",
                  validate: (v) => isValidUrl(v) ? true : "You must enter a valid URL" })
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
              className="w-fit flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Generate tests
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}