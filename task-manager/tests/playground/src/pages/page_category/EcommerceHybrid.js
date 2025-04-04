import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Rating, Badge } from '@mui/material';

const EcommerceHybrid = () => {
  // State for shopping cart
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sample product data
  const products = [
    { id: 1, name: 'Premium Wireless Earbuds', price: 129.99, rating: 4.5, image: null, category: 'Electronics', description: 'Experience crystal-clear sound and 24-hour battery life with our premium wireless earbuds.' },
    { id: 2, name: 'Organic Cotton T-shirt', price: 24.99, rating: 4.2, image: null, category: 'Clothing', description: 'Sustainable fashion made with 100% organic cotton. Comfortable, breathable, and eco-friendly.' },
    { id: 3, name: 'Smart Home Hub', price: 199.99, rating: 4.7, image: null, category: 'Electronics', description: 'Control your entire home with voice commands. Compatible with all major smart devices.' },
    { id: 4, name: 'Stainless Steel Water Bottle', price: 34.99, rating: 4.8, image: null, category: 'Lifestyle', description: 'Keep your drinks cold for 24 hours or hot for 12 hours. BPA-free and eco-friendly.' },
    { id: 5, name: 'Lightweight Running Shoes', price: 89.99, rating: 4.4, image: null, category: 'Footwear', description: 'Ultra-lightweight design with responsive cushioning for your best run yet.' },
    { id: 6, name: 'Bluetooth Portable Speaker', price: 79.99, rating: 4.3, image: null, category: 'Electronics', description: 'Powerful sound in a compact, waterproof design. Perfect for on-the-go.' },
  ];

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...new Set(products.map(product => product.category))];

  // Add item to cart
  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item.id === product.id);

    if (existingItem) {
      const updatedItems = cartItems.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
      setCartItems(updatedItems);
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };

  // Remove item from cart
  const removeFromCart = (productId) => {
    const updatedItems = cartItems.filter(item => item.id !== productId);
    setCartItems(updatedItems);
  };

  // Update item quantity
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;

    const updatedItems = cartItems.map(item =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedItems);
  };

  // Calculate total cart price
  const cartTotal = cartItems.reduce(
    (total, item) => total + (item.price * item.quantity),
    0
  );

  // Quick view product
  const openQuickView = (product) => {
    setQuickViewProduct(product);
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
  };

  // Login functionality
  const handleLogin = (e) => {
    e.preventDefault();
    // In a real app, this would authenticate with a server
    console.log('Login attempted with:', email, password);
    setLoginDialogOpen(false);
    // Clear fields
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">ShopSmart</h1>
              <div className="hidden md:ml-8 md:flex md:space-x-8">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      selectedCategory === category
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <TextField
                  placeholder="Search products..."
                  size="small"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-40 md:w-64"
                />
              </div>

              <button
                className="relative p-1"
                onClick={() => setCartOpen(true)}
              >
                <span className="sr-only">Shopping cart</span>
                <Badge badgeContent={cartItems.reduce((total, item) => total + item.quantity, 0)} color="primary">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </Badge>
              </button>

              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                onClick={() => setLoginDialogOpen(true)}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Marketing Hero Section */}
      <section className="bg-blue-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold mb-4">Summer Sale: Up to 50% Off</h2>
              <p className="text-xl mb-6">Limited time offer on our most popular products. Upgrade your life today with premium quality items.</p>
              <Button
                variant="contained"
                className="bg-white text-blue-900 hover:bg-gray-100"
                size="large"
              >
                Shop Now
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-blue-800 rounded-xl p-8 md:p-12 flex items-center justify-center"
            >
              <p className="text-xl">Hero image placeholder</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Product List */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          {selectedCategory === 'all' ? 'All Products' : selectedCategory}
          {searchQuery && ` - Search results for "${searchQuery}"`}
        </h2>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found. Try adjusting your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map(product => (
              <motion.div
                key={product.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300"
                whileHover={{ y: -5 }}
              >
                <div className="bg-gray-200 h-56 flex items-center justify-center">
                  <p className="text-gray-500">Product image</p>
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                    <p className="text-lg font-bold text-blue-600">${product.price.toFixed(2)}</p>
                  </div>

                  <div className="mt-2 flex items-center">
                    <Rating value={product.rating} precision={0.1} readOnly size="small" />
                    <span className="ml-1 text-sm text-gray-500">({product.rating})</span>
                  </div>

                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{product.description}</p>

                  <div className="mt-4 flex space-x-2">
                    <Button
                      variant="contained"
                      color="primary"
                      className="flex-1"
                      onClick={() => addToCart(product)}
                    >
                      Add to Cart
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => openQuickView(product)}
                    >
                      Quick View
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Marketing Benefits Section */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Shop With Us</h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { title: "Free Shipping", desc: "On all orders over $50" },
              { title: "Easy Returns", desc: "30-day money-back guarantee" },
              { title: "Secure Payments", desc: "Protected by industry leaders" },
              { title: "24/7 Support", desc: "Help when you need it" },
            ].map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto bg-white rounded-full w-16 h-16 flex items-center justify-center shadow-sm mb-4">
                  <span className="text-blue-600 text-2xl">✓</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shopping Cart Drawer */}
      <Dialog
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Your Shopping Cart</DialogTitle>
        <DialogContent>
          {cartItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Your cart is empty</p>
              <Button
                variant="contained"
                color="primary"
                className="mt-4"
                onClick={() => setCartOpen(false)}
              >
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div>
              <ul className="divide-y divide-gray-200">
                {cartItems.map(item => (
                  <li key={item.id} className="py-4 flex">
                    <div className="bg-gray-200 h-20 w-20 flex-shrink-0 rounded flex items-center justify-center">
                      <p className="text-xs text-gray-500">Image</p>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between">
                        <h3 className="text-sm font-medium">{item.name}</h3>
                        <p className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <p className="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
                      <div className="mt-1 flex items-center">
                        <button
                          className="text-gray-500 hover:text-gray-700"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="mx-2 text-sm">{item.quantity}</span>
                        <button
                          className="text-gray-500 hover:text-gray-700"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                        <button
                          className="ml-4 text-red-500 text-sm"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-base font-medium text-gray-900">
                  <p>Subtotal</p>
                  <p>${cartTotal.toFixed(2)}</p>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">Shipping and taxes calculated at checkout.</p>
                <div className="mt-6">
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                  >
                    Checkout
                  </Button>
                </div>
                <div className="mt-2 flex justify-center">
                  <button
                    className="text-sm text-blue-600 hover:text-blue-500"
                    onClick={() => setCartOpen(false)}
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick View Dialog */}
      {quickViewProduct && (
        <Dialog
          open={!!quickViewProduct}
          onClose={closeQuickView}
          maxWidth="md"
          fullWidth
        >
          <DialogContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-200 h-64 md:h-80 flex items-center justify-center rounded">
                <p className="text-gray-500">Product image</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{quickViewProduct.name}</h2>
                <div className="flex items-center mt-2">
                  <Rating value={quickViewProduct.rating} precision={0.1} readOnly />
                  <span className="ml-1 text-sm text-gray-500">({quickViewProduct.rating})</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 mt-2">${quickViewProduct.price.toFixed(2)}</p>
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <p className="text-gray-700">{quickViewProduct.description}</p>
                </div>
                <div className="mt-6">
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    onClick={() => {
                      addToCart(quickViewProduct);
                      closeQuickView();
                    }}
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeQuickView}>Close</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Login Dialog */}
      <Dialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Sign In</DialogTitle>
        <DialogContent>
          <form onSubmit={handleLogin} className="space-y-4 mt-2">
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <button
                  className="text-blue-600 hover:text-blue-500 bg-transparent border-0 p-0 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            </div>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              className="mt-4"
            >
              Sign In
            </Button>
          </form>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                Google
              </button>
              <button className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                Facebook
              </button>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">ShopSmart</h3>
              <p className="text-gray-400">Your one-stop shop for all premium products at affordable prices.</p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Shop</h4>
              <ul className="space-y-2">
                {categories.filter(cat => cat !== 'all').map((category, index) => (
                  <li key={index}>
                    <button
                      className="text-gray-400 hover:text-white bg-transparent border-0 p-0 cursor-pointer"
                    >
                      {category}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Company</h4>
              <ul className="space-y-2">
                {["About", "Careers", "Contact Us", "Blog"].map((item, index) => (
                  <li key={index}>
                    <button
                      className="text-gray-400 hover:text-white bg-transparent border-0 p-0 cursor-pointer"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Stay Updated</h4>
              <p className="text-gray-400 mb-4">Subscribe to our newsletter for the latest products and deals.</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Your email"
                  className="px-3 py-2 text-gray-900 rounded-l-md w-full"
                />
                <button className="bg-blue-600 px-4 py-2 rounded-r-md hover:bg-blue-700">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>© 2023 ShopSmart. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EcommerceHybrid;
