import { useState } from 'react';

const PersonalizationStep = ({ nextStep, prevStep, userData, updateUserData }) => {
  const [formData, setFormData] = useState({
    name: userData.name || '',
    role: userData.role || '',
    teamSize: userData.teamSize || '',
    interests: userData.interests || []
  });

  const [errors, setErrors] = useState({});

  const roles = [
    "CPO / Head of Product",
    "Product Manager",
    "Head of QA",
    "QA Engineer",
    "Other"
  ];

  const teamSizes = [
    "Just me",
    "2-10 people",
    "11-50 people",
    "50-200 people",
    "200+ people"
  ];

  const interestOptions = [
    { id: "web-testing", label: "Web Testing", available: true },
    { id: "mobile-testing", label: "Mobile Testing", available: true },
    { id: "api-testing", label: "API Testing", available: false },
    { id: "performance", label: "Performance Testing", available: false },
    { id: "security", label: "Security Testing", available: false },
    { id: "accessibility", label: "Accessibility Testing", available: false },
    // { id: "automation", label: "Test Automation", available: false },
    // { id: "ci-cd", label: "CI/CD Integration", available: false },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleInterestToggle = (interestId) => {
    // Only allow toggling if the interest is available
    const interest = interestOptions.find(opt => opt.id === interestId);
    if (!interest?.available) return;

    const updatedInterests = formData.interests.includes(interestId)
      ? formData.interests.filter(id => id !== interestId)
      : [...formData.interests, interestId];
    
    setFormData({ ...formData, interests: updatedInterests });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.role) {
      newErrors.role = "Please select your role";
    }
    if (!formData.teamSize) {
      newErrors.teamSize = "Please select your team size";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      updateUserData(formData);
      nextStep();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Personalize Your Experience</h2>
      <p className="text-gray-600 mb-8 text-center max-w-xl mx-auto">
        Help us tailor the QA Agent Dashboard to your specific needs
      </p>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Your Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your name"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">Your Role</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              errors.role ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select your role</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
        </div>

        <div>
          <label htmlFor="teamSize" className="block text-sm font-medium text-gray-700">Team Size</label>
          <select
            id="teamSize"
            name="teamSize"
            value={formData.teamSize}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              errors.teamSize ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select your team size</option>
            {teamSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          {errors.teamSize && <p className="mt-1 text-sm text-red-600">{errors.teamSize}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Areas of Interest</label>
          <p className="text-xs text-gray-500 mb-3">Select all that apply to your testing needs</p>
          
          <div className="grid grid-cols-2 gap-3">
            {interestOptions.map((interest) => (
              <div 
                key={interest.id}
                onClick={() => handleInterestToggle(interest.id)}
                className={`p-3 rounded-md border ${
                  !interest.available 
                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-75'
                    : formData.interests.includes(interest.id)
                      ? 'bg-blue-50 border-blue-300 text-blue-700 cursor-pointer'
                      : 'bg-white border-gray-300 hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      !interest.available
                        ? 'bg-gray-300'
                        : formData.interests.includes(interest.id)
                          ? 'bg-blue-500'
                          : 'bg-gray-200'
                    }`}>
                      {formData.interests.includes(interest.id) && interest.available && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="ml-2 text-sm">{interest.label}</span>
                  </div>
                  {!interest.available && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-10">
        <button
          onClick={prevStep}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default PersonalizationStep; 