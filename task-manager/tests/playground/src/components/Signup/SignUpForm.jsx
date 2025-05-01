import React, { useState } from 'react';
// Import the terms components
import UserAgreement from '../Terms/UserAgreement';
import PrivacyPolicy from '../Terms/PrivacyPolicy';

const SignUpForm = ({
  onSwitchToLogin,
  minPasswordLength = 7,
  requireUppercase = true,
  requireSymbol = true,
}) => {
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSignedUp, setIsSignedUp] = useState(false);

  // Add state for modal visibility
  const [showAgreement, setShowAgreement] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  const validateEmail = () => {
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (email !== confirmEmail) {
      setEmailError("Emails don't match");
      return false;
    }
    // Basic email format check (optional)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Invalid email format");
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = () => {
    setPasswordError(''); // Clear previous error
    const errors = [];

    // Check length
    if (password.length < minPasswordLength) {
      errors.push(`at least ${minPasswordLength} characters`);
    }

    // Check for uppercase if required
    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("an uppercase letter");
    }

    // Check for symbol if required
    // Basic symbol check (adjust regex as needed for specific symbols)
    if (requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
      errors.push("a symbol (e.g., !@#$%^&*)");
    }

    // Set error message if any rules failed
    if (errors.length > 0) {
      setPasswordError(`Password must contain ${errors.join(', ')}.`);
      return false;
    }

    // All checks passed
    setPasswordError('');
    return true;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    if (isEmailValid && isPasswordValid) {
      // Simulate successful sign-up
      console.log('Signing up with:', { email, password });
      setIsSignedUp(true);
      // Reset fields after successful signup
      setEmail('');
      setConfirmEmail('');
      setPassword('');
    } else {
        setIsSignedUp(false);
    }
  };

  const isSubmitDisabled = !email || !confirmEmail || !password || !!emailError || !!passwordError;

  if (isSignedUp) {
    return (
      <div id="signUpSuccess" data-testid="signup-success">
        <h2>Sign Up Successful!</h2>
        <p>Welcome, {email}!</p>
      </div>
    );
  }

  const renderModal = (title, content, closeHandler) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
            <h3 className="text-xl font-semibold">{title}</h3>
            <button
                onClick={closeHandler}
                className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
                aria-label="Close modal"
            >
                &times;
            </button>
        </div>
        <div className="p-6">
             {content}
        </div>
      </div>
    </div>
  );

  return (
    // Add relative positioning for potential modal context if needed, though fixed should work
    <div className="w-full max-w-md mx-auto relative">
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="inputWrapper">
          <label htmlFor="registerEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="registerEmail"
            placeholder="Email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            type="email"
            name="email"
            aria-label="register email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="register-email"
          />
        </div>
        <div className="inputWrapper">
          <label htmlFor="registerConfirmEmail" className="block text-sm font-medium text-gray-700 mb-1">Confirm Email</label>
          <input
            id="registerConfirmEmail"
            placeholder="Confirm Email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            type="email"
            name="confirmEmail"
            aria-label="Confirm Email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            data-testid="confirm-email"
          />
        </div>
        {emailError && <div id="confirmEmailError" data-testid="email-error" className="text-red-500 text-sm mt-1">{emailError}</div>}

        <div className="inputWrapper">
          <label htmlFor="registerPassword" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            placeholder="Password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            type="password"
            name="password"
            aria-label="register password"
            id="registerPassword"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={validatePassword}
            data-testid="register-password"
          />
        </div>
        {passwordError && <span id="registerPasswordError" data-testid="password-error" className="text-red-500 text-sm mt-1">{passwordError}</span>}

        <span className="block text-xs text-gray-500">
          By signing up, you agree to the
          <button
            type="button"
            // Update onClick to set local state
            onClick={() => setShowAgreement(true)}
            // No longer need disabled check based on props
            className="font-medium text-indigo-600 hover:text-indigo-500 mx-1"
          >
            user agreement
          </button>
           and the
          <button
            type="button"
            // Update onClick to set local state
            onClick={() => setShowPolicy(true)}
             // No longer need disabled check based on props
            className="font-medium text-indigo-600 hover:text-indigo-500 ml-1"
            >
            privacy policy
          </button>
          .
        </span>

        <button
          id="sign-up-btn"
          type="submit"
          className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isSubmitDisabled}
          data-testid="sign-up-btn"
        >
          Sign Up
        </button>

        <span className="block text-sm text-center text-gray-600 mt-4">
          Already have an account?
          <button
             type="button"
             onClick={onSwitchToLogin}
             disabled={!onSwitchToLogin}
             className="font-medium text-indigo-600 hover:text-indigo-500 ml-1 disabled:opacity-50 disabled:cursor-not-allowed">
            Log in
          </button>
        </span>
      </form>

      {/* Render Modals Conditionally */}
      {showAgreement && renderModal(
        "User Agreement",
        <UserAgreement />,
        () => setShowAgreement(false)
      )}

      {showPolicy && renderModal(
        "Privacy Policy",
        <PrivacyPolicy />,
        () => setShowPolicy(false)
      )}

    </div>
  );
};

export default SignUpForm;
