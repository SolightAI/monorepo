import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="p-6 bg-white rounded shadow-md max-w-2xl mx-auto my-8">
      <h2 className="text-2xl font-bold mb-4">Privacy Policy</h2>
      <div className="space-y-4 text-gray-700">
        <p>
          Your privacy is important to us. It is our policy to respect your
          privacy regarding any information we may collect from you across our
          website, and other sites we own and operate.
        </p>
        <h3 className="text-lg font-semibold mt-4">Information We Collect</h3>
        <p>
          We only ask for personal information when we truly need it to provide a
          service to you. We collect it by fair and lawful means, with your
          knowledge and consent. We also let you know why we're collecting it and
          how it will be used.
        </p>
        <h3 className="text-lg font-semibold mt-4">Log Data</h3>
        <p>
          When you visit our website, our servers may automatically log the standard
          data provided by your web browser. This data may include your computer's
          Internet Protocol (IP) address, your browser type and version, the pages
          you visit, the time and date of your visit, the time spent on each page,
          and other details.
        </p>
        <h3 className="text-lg font-semibold mt-4">Security</h3>
        <p>
          We value your trust in providing us your Personal Information, thus we are
          striving to use commercially acceptable means of protecting it. But
          remember that no method of transmission over the internet, or method of
          electronic storage is 100% secure and reliable, and we cannot guarantee
          its absolute security.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
