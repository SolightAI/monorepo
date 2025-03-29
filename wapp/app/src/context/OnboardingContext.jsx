import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const OnboardingContext = createContext(null);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(5); // Default number of steps
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Check onboarding status from the server
  const checkOnboardingStatus = useCallback(async () => {
    try {
      setLoading(true);

      // First check if we can get the status from the user object
      if (user && user.onboarding_completed !== undefined) {
        console.log('Getting onboarding status from user object:', user.onboarding_completed);
        const isCompleted = user.onboarding_completed;
        setOnboardingCompleted(isCompleted);

        // Show onboarding if not completed
        if (!isCompleted) {
          console.log('Onboarding not completed, showing onboarding modal');
          // Get from local storage to see if there was a previously started but not completed session
          const savedStep = localStorage.getItem('onboardingCurrentStep');
          if (savedStep) {
            setCurrentStep(parseInt(savedStep, 10));
          }

          setShowOnboarding(true);
        } else {
          setShowOnboarding(false);
        }
        setLoading(false);
        return;
      }

      // Fallback to preferences API
      console.log('Checking onboarding status from API');
      const response = await axios.get(`${API_URL}/users/preferences`, {
        withCredentials: true
      });

      const isCompleted = response.data.onboarding_completed;
      console.log('API returned onboarding status:', isCompleted);
      setOnboardingCompleted(isCompleted);

      // Show onboarding if not completed
      if (!isCompleted) {
        // Get from local storage to see if there was a previously started but not completed session
        const savedStep = localStorage.getItem('onboardingCurrentStep');
        if (savedStep) {
          setCurrentStep(parseInt(savedStep, 10));
        }

        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setError('Failed to check onboarding status');

      // Fallback to local storage if API fails
      const localCompleted = localStorage.getItem('onboardingCompleted') === 'true';
      setOnboardingCompleted(localCompleted);
      setShowOnboarding(!localCompleted && isAuthenticated);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Check if onboarding is completed from local storage or API
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User is authenticated, checking onboarding status');
      checkOnboardingStatus();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user, checkOnboardingStatus]);

  // Update onboarding status on the server
  const updateOnboardingStatus = useCallback(async (completed) => {
    try {
      await axios.post(
        `${API_URL}/users/onboarding/completed`,
        { completed },
        { withCredentials: true }
      );

      // Update local state
      setOnboardingCompleted(completed);
      localStorage.setItem('onboardingCompleted', completed.toString());

      if (completed) {
        // Clear step data if onboarding is completed
        localStorage.removeItem('onboardingCurrentStep');
        setShowOnboarding(false);
      }

      return true;
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      setError('Failed to update onboarding status');
      return false;
    }
  }, []);

  // Go to next step
  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      localStorage.setItem('onboardingCurrentStep', newStep.toString());
    } else {
      // If at last step, complete onboarding
      completeOnboarding();
    }
  }, [currentStep, totalSteps]);

  // Go to previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      localStorage.setItem('onboardingCurrentStep', newStep.toString());
    }
  }, [currentStep]);

  // Go to specific step
  const goToStep = useCallback((step) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
      localStorage.setItem('onboardingCurrentStep', step.toString());
    }
  }, [totalSteps]);

  // Skip onboarding
  const skipOnboarding = useCallback(async () => {
    const success = await updateOnboardingStatus(true);
    if (success) {
      setShowOnboarding(false);
    }
  }, [updateOnboardingStatus]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    const success = await updateOnboardingStatus(true);
    if (success) {
      setShowOnboarding(false);
    }
  }, [updateOnboardingStatus]);

  // Start/show onboarding
  const startOnboarding = useCallback(() => {
    setCurrentStep(0);
    localStorage.setItem('onboardingCurrentStep', '0');
    setShowOnboarding(true);
    updateOnboardingStatus(false);
  }, [updateOnboardingStatus]);

  return (
    <OnboardingContext.Provider
      value={{
        showOnboarding,
        currentStep,
        totalSteps,
        loading,
        error,
        onboardingCompleted,
        nextStep,
        prevStep,
        goToStep,
        skipOnboarding,
        completeOnboarding,
        startOnboarding,
        setTotalSteps,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};
