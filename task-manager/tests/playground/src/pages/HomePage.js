import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent, Typography, Grid, Divider } from '@mui/material';

const HomePage = () => {
  const testCases = [
    {
      title: "Marketing vs Webapp Test Cases",
      description: "Test cases to help the agent distinguish between marketing websites and webapps",
      items: [
        { name: "Pure Marketing Landing Page", path: "/category/marketing", description: "A classic marketing landing page with hero section, features, testimonials, and CTAs" },
        { name: "Task Management Webapp", path: "/category/webapp", description: "A fully interactive webapp with task creation, filtering, and state management" },
        { name: "E-commerce (Hybrid)", path: "/category/ecommerce", description: "An e-commerce site with both marketing elements and webapp functionality" },
        { name: "Analytics Dashboard", path: "/category/analytics", description: "A data visualization dashboard that's clearly a webapp" },
        { name: "Blog Landing", path: "/category/blog", description: "A minimalist blog landing page with marketing purpose" }
      ]
    },
    {
      title: "Authentication Test Cases",
      description: "Test cases for different authentication UIs",
      items: [
        { name: "Simple Email/Password Login", path: "/auth/email_password/simple", description: "Clean, minimalist email/password login page" },
        { name: "Messy Email/Password Login", path: "/auth/email_password/messy", description: "Cluttered email/password login with distractions" },
        { name: "Simple Google Auth", path: "/auth/google/simple", description: "Clean, minimalist Google authentication" },
        { name: "Messy Google Auth", path: "/auth/google/messy", description: "Cluttered Google authentication with distractions" },
        { name: "Simple Staged Login", path: "/auth/staged/simple", description: "Clean, minimalist staged login with username then password" },
        { name: "Messy Staged Login", path: "/auth/staged/messy", description: "Cluttered staged login with distractions" },
        { name: "Simple Instant Login", path: "/auth/instant/simple", description: "Clean, minimalist instant login interface" },
        { name: "Messy Instant Login", path: "/auth/instant/messy", description: "Cluttered instant login with distractions" },
        { name: "Simple Combined (Email/Google)", path: "/auth/combined/classic_google/simple", description: "Clean UI with both email/password and Google options" },
        { name: "Messy Combined (Email/Google)", path: "/auth/combined/classic_google/messy", description: "Cluttered UI with both email/password and Google options" },
        { name: "Simple Combined (Email/Instant)", path: "/auth/combined/classic_instant/simple", description: "Clean UI with both email/password and instant login options" },
        { name: "Messy Combined (Instant/Google)", path: "/auth/combined/classic_instant/messy", description: "Cluttered UI with both instant login and Google options" }
      ]
    },
    {
      title: "Epic Generation",
      description: "Test cases for epic generation",
      items: [
        { name: "Task Dashboard with Hidden Auth Banner", path: "/epic/hidden-auth-banner", description: "Normal-looking task dashboard page with a non-visible authentication banner in the markup" },
      ]
    },
    {
      title: "Epic Generation",
      description: "Test cases for epic generation",
      items: [
        { name: "Task Dashboard with Hidden Auth Banner", path: "/epic/hidden-auth-banner", description: "Normal-looking task dashboard page with a non-visible authentication banner in the markup" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <Typography variant="h3" component="h1" gutterBottom>
            Agent Testing Playground
          </Typography>
          <Typography variant="h6" color="textSecondary">
            Test cases to evaluate agent performance in distinguishing between different website types
          </Typography>
        </header>

        {testCases.map((category, categoryIndex) => (
          <div key={categoryIndex} className="mb-12">
            <Typography variant="h4" component="h2" gutterBottom>
              {category.title}
            </Typography>
            <Typography variant="body1" paragraph>
              {category.description}
            </Typography>

            <Grid container spacing={3}>
              {category.items.map((item, itemIndex) => (
                <Grid item xs={12} md={6} key={itemIndex}>
                  <Card variant="outlined" className="h-full">
                    <CardContent>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {item.description}
                      </Typography>
                      <Button
                        component={Link}
                        to={item.path}
                        variant="contained"
                        color="primary"
                        size="small"
                      >
                        View Test Case
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </div>
        ))}

        <Divider className="my-8" />

        <footer className="text-center">
          <Typography variant="body2" color="textSecondary">
            Testing framework for distinguishing between marketing websites and webapps
          </Typography>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
