import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@mui/material';

const MarketingLanding = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-bold text-gray-900 mb-6"
          >
            Next-Gen Marketing Platform
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
          >
            Supercharge your brand with our AI-powered marketing solutions. Increase conversions by up to 300% with our proprietary technology.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button variant="contained" color="primary" size="large" className="px-8 py-3 bg-blue-600 hover:bg-blue-700">
              Book a Demo
            </Button>
            <Button variant="outlined" color="primary" size="large" className="px-8 py-3">
              View Pricing
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 relative"
        >
          <div className="bg-gray-200 rounded-xl h-[400px] w-full flex items-center justify-center">
            <p className="text-gray-500 text-xl">Hero image placeholder</p>
          </div>
        </motion.div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-gray-600 mb-8">Trusted by over 10,000+ companies worldwide</p>
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {["Company 1", "Company 2", "Company 3", "Company 4", "Company 5"].map((company, index) => (
              <div key={index} className="w-32 h-12 bg-gray-200 rounded flex items-center justify-center">
                <p className="text-gray-500">{company}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Why Companies Choose Us</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "AI-Powered", desc: "Our AI analyzes customer behavior to optimize conversions" },
            { title: "Easy Integration", desc: "Connect with your existing tools in minutes, not days" },
            { title: "24/7 Support", desc: "Our dedicated team is always available to help you succeed" }
          ].map((feature, index) => (
            <div key={index} className="p-6 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600">✓</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">What Our Clients Say</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { name: "Jane Smith", role: "Marketing Director", company: "TechCorp", text: "This platform increased our conversion rate by 250% in just two months." },
              { name: "John Doe", role: "CEO", company: "StartupX", text: "The ROI we've seen since implementing this solution has been incredible." }
            ].map((testimonial, index) => (
              <div key={index} className="p-6 bg-white rounded-lg shadow">
                <p className="text-gray-600 mb-4">"{testimonial.text}"</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Marketing?</h2>
          <p className="text-xl text-gray-600 mb-8">Join thousands of companies already growing with our platform.</p>
          <Button variant="contained" color="primary" size="large" className="px-8 py-3 bg-blue-600 hover:bg-blue-700">
            Get Started Free
          </Button>
          <p className="mt-4 text-sm text-gray-500">No credit card required. 14-day free trial.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">MarketingPro</h3>
            <p className="text-gray-400">The all-in-one marketing platform for growing businesses.</p>
          </div>
          <div>
            <h4 className="font-medium mb-4">Product</h4>
            <ul className="space-y-2">
              {["Features", "Pricing", "Case Studies", "Resources"].map((item, index) => (
                <li key={index}>
                  <button className="text-gray-400 hover:text-white bg-transparent border-0 p-0 cursor-pointer">
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4">Company</h4>
            <ul className="space-y-2">
              {["About", "Careers", "Contact", "Blog"].map((item, index) => (
                <li key={index}>
                  <button className="text-gray-400 hover:text-white bg-transparent border-0 p-0 cursor-pointer">
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4">Legal</h4>
            <ul className="space-y-2">
              {["Privacy", "Terms", "Security", "Cookies"].map((item, index) => (
                <li key={index}>
                  <button className="text-gray-400 hover:text-white bg-transparent border-0 p-0 cursor-pointer">
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
          <p>© 2023 MarketingPro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLanding;
