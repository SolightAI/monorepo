import React from 'react';
import { Button, TextField } from '@mui/material';

const BlogLanding = () => {
  const recentPosts = [
    {
      id: 1,
      title: "10 Essential Tips for Remote Work Productivity",
      excerpt: "Working from home has become the new normal for many. Here are our top tips to stay productive while maintaining work-life balance.",
      author: "Alex Morgan",
      date: "April 2, 2023",
      category: "Productivity",
      imageUrl: null
    },
    {
      id: 2,
      title: "The Future of AI in Everyday Applications",
      excerpt: "Artificial intelligence is no longer just for tech companies. Discover how AI is transforming everyday applications and what it means for you.",
      author: "Jamie Chen",
      date: "March 28, 2023",
      category: "Technology",
      imageUrl: null
    },
    {
      id: 3,
      title: "Sustainable Living: Small Changes with Big Impact",
      excerpt: "You don't need to overhaul your entire life to be more eco-friendly. These small, sustainable changes can make a significant difference.",
      author: "Taylor Reed",
      date: "March 15, 2023",
      category: "Lifestyle",
      imageUrl: null
    }
  ];

  const categories = [
    { name: "Technology", count: 24 },
    { name: "Productivity", count: 18 },
    { name: "Lifestyle", count: 15 },
    { name: "Design", count: 12 },
    { name: "Business", count: 10 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header/Navigation */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">MinimalistBlog</h1>
            <nav className="hidden md:flex space-x-8">
              {["Home", "Articles", "Categories", "About", "Contact"].map((item, index) => (
                // eslint-disable-next-line jsx-a11y/anchor-is-valid
                <button
                  key={index}
                  className="text-gray-500 hover:text-gray-900 text-sm font-medium bg-transparent border-0 cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </nav>
            <button className="md:hidden">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Insights for the Modern Thinker</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Thoughtful articles on productivity, technology, and mindful living to help you navigate today's complex world.
          </p>
          <Button
            variant="contained"
            color="primary"
            size="large"
            className="px-8 py-3"
          >
            Read Latest Articles
          </Button>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="md:flex">
              <div className="md:flex-shrink-0 bg-gray-200 md:w-48 flex items-center justify-center p-6 md:p-0">
                <div className="text-gray-400">Featured Image</div>
              </div>
              <div className="p-8">
                <div className="uppercase tracking-wide text-sm text-blue-600 font-semibold">
                  Featured Article
                </div>
                <button
                  className="block mt-1 text-2xl font-bold text-gray-900 hover:underline text-left bg-transparent border-0 cursor-pointer w-full"
                >
                  How to Build a Sustainable Digital Lifestyle
                </button>
                <p className="mt-2 text-gray-600">
                  In an age of constant connectivity, digital minimalism offers a path to reclaiming your attention and living more intentionally with technology.
                </p>
                <div className="mt-4 flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Chris Anderson</p>
                    <div className="flex space-x-1 text-sm text-gray-500">
                      <time dateTime="2023-04-01">April 1, 2023</time>
                      <span aria-hidden="true">&middot;</span>
                      <span>8 min read</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Recent Articles</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {recentPosts.map(post => (
              <div key={post.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-300">
                <div className="bg-gray-200 h-48 flex items-center justify-center">
                  <span className="text-gray-400">Post Image</span>
                </div>
                <div className="p-6">
                  <div>
                    <button
                      className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-2 border-0 cursor-pointer"
                    >
                      {post.category}
                    </button>
                  </div>
                  <button
                    className="block text-xl font-semibold text-gray-900 hover:underline mb-2 bg-transparent border-0 cursor-pointer text-left w-full"
                  >
                    {post.title}
                  </button>
                  <p className="text-gray-600 mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center text-sm text-gray-500">
                    <span>{post.author}</span>
                    <span className="mx-1">&middot;</span>
                    <span>{post.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button
              variant="outlined"
              color="primary"
              className="px-6 py-2"
            >
              View All Articles
            </Button>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Get the Latest Articles Delivered</h2>
          <p className="text-blue-100 max-w-2xl mx-auto mb-8">
            Join our newsletter and be the first to receive our newest insights, tips, and exclusive content straight to your inbox.
          </p>

          <div className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-2">
              <TextField
                placeholder="Your email address"
                variant="outlined"
                fullWidth
                className="bg-white rounded-md"
                InputProps={{
                  className: "border-0",
                }}
              />
              <Button
                variant="contained"
                className="bg-blue-700 hover:bg-blue-800 whitespace-nowrap"
              >
                Subscribe
              </Button>
            </div>
            <p className="text-blue-200 text-sm mt-3">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>

      {/* Categories and About */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Categories */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Explore by Category</h3>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <ul className="space-y-3">
                  {categories.map((category, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <button
                        className="text-blue-600 hover:text-blue-800 bg-transparent border-0 cursor-pointer p-0"
                      >
                        {category.name}
                      </button>
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                        {category.count} articles
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* About */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">About MinimalistBlog</h3>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-gray-600 mb-4">
                  MinimalistBlog was founded with a simple mission: to share meaningful insights on topics that matter, without the clutter and distractions found on most websites.
                </p>
                <p className="text-gray-600 mb-4">
                  Our team of writers and thinkers are dedicated to creating thoughtful, well-researched content that helps our readers navigate the complexities of modern life.
                </p>
                <Button
                  variant="text"
                  color="primary"
                >
                  Learn More About Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6">
            <svg className="h-12 w-12 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>
          <blockquote className="text-xl text-gray-600 italic mb-8 max-w-3xl mx-auto">
            "MinimalistBlog has become my go-to source for thoughtful insights on productivity and technology. Their articles have genuinely helped me improve my work-life balance."
          </blockquote>
          <div className="flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-gray-200 mr-3"></div>
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">Sarah Johnson</div>
              <div className="text-sm text-gray-500">Product Designer at TechCorp</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">MinimalistBlog</h3>
              <p className="text-gray-400">
                Thoughtful insights for the modern thinker.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Navigation</h4>
              <ul className="space-y-2">
                {["Home", "Articles", "Categories", "About", "Contact"].map((item, index) => (
                  <li key={index}>
                    <button
                      className="text-gray-400 hover:text-white bg-transparent border-0 cursor-pointer p-0"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Popular Categories</h4>
              <ul className="space-y-2">
                {categories.slice(0, 4).map((category, index) => (
                  <li key={index}>
                    <button
                      className="text-gray-400 hover:text-white bg-transparent border-0 cursor-pointer p-0"
                    >
                      {category.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Legal</h4>
              <ul className="space-y-2">
                {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item, index) => (
                  <li key={index}>
                    <button
                      className="text-gray-400 hover:text-white bg-transparent border-0 cursor-pointer p-0"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>© 2023 MinimalistBlog. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BlogLanding;
