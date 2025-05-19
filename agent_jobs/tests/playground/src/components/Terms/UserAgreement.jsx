import React from 'react';

const UserAgreement = () => {
  return (
    <div className="p-6 bg-white rounded shadow-md max-w-2xl mx-auto my-8">
      <h2 className="text-2xl font-bold mb-4">User Agreement</h2>
      <div className="space-y-4 text-gray-700">
        <p>
          Welcome to our service! By using our service, you agree to these terms.
          Please read them carefully.
        </p>
        <h3 className="text-lg font-semibold mt-4">1. Using our Services</h3>
        <p>
          You must follow any policies made available to you within the Services.
          Don't misuse our Services. For example, don't interfere with our
          Services or try to access them using a method other than the interface
          and the instructions that we provide...
        </p>
        <h3 className="text-lg font-semibold mt-4">2. Your Account</h3>
        <p>
          You may need an account in order to use some of our Services. You may
          create your own account, or an account may be assigned to you by an
          administrator...
        </p>
        <h3 className="text-lg font-semibold mt-4">3. Privacy and Copyright Protection</h3>
        <p>
          Our privacy policies explain how we treat your personal data and protect
          your privacy when you use our Services. By using our Services, you
          agree that we can use such data in accordance with our privacy policies.
        </p>
      </div>
    </div>
  );
};

export default UserAgreement;
