import React from 'react';

const Privacy = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
        <p className="mb-4">
          At Laneo, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the platform.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
        <div className="space-y-4">
          <h3 className="text-xl font-medium">Personal Information</h3>
          <p>We may collect personal information that you voluntarily provide to us when you:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Register on our platform</li>
            <li>Express interest in obtaining information about us or our products</li>
            <li>Participate in activities on our platform</li>
            <li>Contact us</li>
          </ul>

          <h3 className="text-xl font-medium mt-6">Usage Information</h3>
          <p>We automatically collect certain information when you visit, use, or navigate our platform. This information may include:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Device and usage information</li>
            <li>IP address</li>
            <li>Browser and device characteristics</li>
            <li>Operating system</li>
            <li>Language preferences</li>
            <li>Referring URLs</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
        <p className="mb-4">We use the information we collect to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Provide, operate, and maintain our platform</li>
          <li>Improve, personalize, and expand our platform</li>
          <li>Understand and analyze how you use our platform</li>
          <li>Develop new products, services, features, and functionality</li>
          <li>Communicate with you about our products and services</li>
          <li>Process your transactions</li>
          <li>Prevent fraudulent transactions and monitor against theft</li>
          <li>Send you marketing and promotional communications</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Information Sharing</h2>
        <p className="mb-4">We may share your information with:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Business partners and third-party vendors who assist us in operating our platform</li>
          <li>Advertisers and advertising networks</li>
          <li>Analytics providers</li>
          <li>Law enforcement or other governmental authority as required by law</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Your Privacy Rights</h2>
        <p className="mb-4">You have the right to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Access your personal information</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your information</li>
          <li>Object to our processing of your information</li>
          <li>Withdraw consent</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
        <p>
          If you have questions or concerns about this Privacy Policy, please contact us at:
          <br />
          Email: privacy@laneo.ai
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Updates to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. The updated version will be indicated by an updated "Last updated" date and the updated version will be effective as soon as it is accessible.
        </p>
      </section>

      <footer className="text-sm text-gray-600">
        Last updated: February 2024
      </footer>
    </div>
  );
};

export default Privacy;