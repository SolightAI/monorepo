/**
 * InteractiveDemo.js
 * 
 * This component provides an interactive demonstration of Laneo's AI-powered user behavior simulation platform.
 * It simulates a simplified e-commerce website where users can observe and influence AI-driven customer behaviors
 * in real-time.
 * 
 * Key Features:
 * 1. Simulated E-commerce Interface:
 *    - Product grid layout
 *    - Navigation menu
 *    - Shopping cart
 *    - Checkout flow
 * 
 * 2. User Behavior Visualization:
 *    - Real-time user paths shown as smooth curves
 *    - Heatmap overlay of interaction points
 *    - User avatars with different personas (casual browsers, determined buyers, etc.)
 *    - Interaction states (browsing, comparing, checkout, etc.)
 * 
 * 3. Interactive Elements:
 *    - Drag-and-drop UI modifications
 *    - A/B testing toggle
 *    - Conversion optimization suggestions
 *    - User behavior control panel
 * 
 * 4. Real-time Analytics:
 *    - Conversion funnel
 *    - Engagement metrics
 *    - Behavior patterns
 *    - Revenue impact
 * 
 * Implementation Details:
 * - Uses Canvas API for high-performance rendering
 * - Implements particle system for user simulation
 * - Uses requestAnimationFrame for smooth animations
 * - Maintains state with React hooks
 * - Supports high DPI displays
 * - Implements efficient collision detection
 * - Uses alpha blending for visual effects
 */

import React, { useEffect, useRef, useState } from 'react';
import { ShoppingCart, Users, BarChart3, Layout } from 'lucide-react';

/**
 * Product catalog for the simulated e-commerce store
 * Each product has:
 * - id: Unique identifier
 * - name: Display name
 * - price: Cost in USD
 * - category: Product classification
 */
const PRODUCTS = [
  { id: 1, name: 'Premium Headphones', price: 199.99, category: 'Electronics' },
  { id: 2, name: 'Wireless Mouse', price: 49.99, category: 'Electronics' },
  { id: 3, name: 'Smart Watch', price: 299.99, category: 'Wearables' },
  { id: 4, name: 'Laptop Backpack', price: 79.99, category: 'Accessories' },
  { id: 5, name: 'Bluetooth Speaker', price: 129.99, category: 'Electronics' },
  { id: 6, name: 'Phone Case', price: 24.99, category: 'Accessories' }
];

/**
 * User personas with their visual and behavioral characteristics
 * Each persona has:
 * - color: HSLA color for visual representation
 * - speed: Movement speed multiplier
 */
const PERSONAS = {
  BROWSER: { color: 'hsla(190, 70%, 50%, 0.6)', speed: 0.5 },  // Casual visitors
  BUYER: { color: 'hsla(210, 100%, 60%, 0.8)', speed: 0.8 },   // Intent to purchase
  RESEARCHER: { color: 'hsla(150, 70%, 50%, 0.6)', speed: 0.3 } // Detail-oriented
};

/**
 * Possible interaction states for simulated users
 * Defines the full user journey from browsing to purchase
 */
const INTERACTION_STATES = {
  BROWSING: 'browsing',   // Initial exploration
  COMPARING: 'comparing', // Comparing products
  CART: 'cart',          // Items in cart
  CHECKOUT: 'checkout'    // Completing purchase
};

const InteractiveDemo = () => {
  // Canvas and container refs for DOM manipulation
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Real-time metrics state
  const [metrics, setMetrics] = useState({
    activeUsers: 0,      // Current number of users
    conversions: 0,      // Completed purchases
    avgTimeOnSite: 0,    // Average session duration
    cartValue: 0         // Total value in carts
  });
  
  // Feature toggles and UI state
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [abTestActive, setAbTestActive] = useState(false);
  
  // Persistent refs for simulation data
  const agentsRef = useRef([]);           // Simulated users
  const heatmapDataRef = useRef(new Map()); // Interaction density data
  const frameRef = useRef(null);          // Animation frame handle

  // Add mouse interaction state
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Add mouse interaction state
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [interactionMode, setInteractionMode] = useState('default'); // 'default', 'attract', 'repel'

  /**
   * Creates initial set of simulated users with random properties
   * @returns {Array} Array of agent objects with initial state
   */
  const initializeAgents = () => {
    const agents = [];
    for (let i = 0; i < 30; i++) {
      agents.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        persona: Object.keys(PERSONAS)[Math.floor(Math.random() * 3)],
        state: INTERACTION_STATES.BROWSING,
        target: null,
        path: [],
        timeOnSite: 0,
        cart: []
      });
    }
    return agents;
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    agentsRef.current = initializeAgents();

    /**
     * Main animation loop for canvas rendering
     * Handles all drawing and updates per frame
     */
    const updateCanvas = () => {
      if (!canvas) return;

      // Configure canvas for high DPI displays
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Set physical pixels
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Scale all drawing operations
      ctx.scale(dpr, dpr);
      
      // Clear canvas completely each frame
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Render all visual elements with correct scaling
      drawProductGrid(ctx, rect);
      if (showHeatmap) {
        drawHeatmap(ctx, rect);
      }
      updateAgents(rect);
      drawAgents(ctx);
      drawPaths(ctx);
      updateMetrics();

      frameRef.current = requestAnimationFrame(updateCanvas);
    };

    /**
     * Renders the product grid layout
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    const drawProductGrid = (ctx, rect) => {
      // Adjust grid layout to prevent overlapping
      const columns = 3;
      const rows = 2;
      const gridWidth = rect.width / (columns + 1);
      const gridHeight = rect.height / (rows + 1);
      const boxWidth = gridWidth * 0.8;
      const boxHeight = gridHeight * 0.8;
      
      PRODUCTS.forEach((product, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = (col + 1) * gridWidth;
        const y = (row + 1) * gridHeight;

        // Product zone boundary with proper spacing
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          x - boxWidth/2,
          y - boxHeight/2,
          boxWidth,
          boxHeight
        );

        // Product information with better positioning
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(product.name, x, y - boxHeight/4);
        ctx.font = '14px sans-serif';
        ctx.fillText(`$${product.price}`, x, y);
      });
      ctx.textAlign = 'left'; // Reset text alignment
    };

    /**
     * Renders the interaction heatmap overlay
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    const drawHeatmap = (ctx, rect) => {
      heatmapDataRef.current.forEach((value, key) => {
        const [x, y] = key.split(',').map(Number);
        const alpha = Math.min(value / 100, 0.5);
        
        ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    /**
     * Updates all agent states and positions
     * Handles movement, state transitions, and interaction recording
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    const updateAgents = (rect) => {
      agentsRef.current.forEach(agent => {
        const persona = PERSONAS[agent.persona];
        
        // Handle mouse interaction
        if (interactionMode !== 'default') {
          const dx = mousePosition.x - agent.x;
          const dy = mousePosition.y - agent.y;
          const dist = Math.hypot(dx, dy);
          
          if (dist < 100) { // Interaction radius
            const force = (interactionMode === 'attract' ? 1 : -1) * (1 - dist / 100);
            agent.vx += (dx / dist) * force;
            agent.vy += (dy / dist) * force;
          }
        }

        // Handle state transitions with improved logic
        if (Math.random() < 0.005) { // Reduced frequency of state changes
          switch (agent.state) {
            case INTERACTION_STATES.BROWSING:
              if (agent.persona === 'BUYER' && Math.random() < 0.3) {
                agent.state = INTERACTION_STATES.CART;
                agent.cart.push(PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)]);
              }
              break;
            case INTERACTION_STATES.CART:
              if (Math.random() < 0.2) {
                agent.state = INTERACTION_STATES.CHECKOUT;
              }
              break;
            default:
              break;
          }
        }

        // Smoother movement with inertia
        if (agent.target) {
          const dx = agent.target.x - agent.x;
          const dy = agent.target.y - agent.y;
          const dist = Math.hypot(dx, dy);
          
          if (dist < 5) {
            agent.target = null;
          } else {
            // Add inertia for smoother movement
            const speed = persona.speed * 1.5;
            const targetVx = (dx / dist) * speed;
            const targetVy = (dy / dist) * speed;
            
            // Smooth velocity transitions
            agent.vx += (targetVx - agent.vx) * 0.1;
            agent.vy += (targetVy - agent.vy) * 0.1;
          }
        } else {
          if (Math.random() < 0.02) {
            // Target nearby products more often
            const targetProduct = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
            const productIndex = PRODUCTS.indexOf(targetProduct);
            const col = productIndex % 3;
            const row = Math.floor(productIndex / 3);
            const gridWidth = rect.width / 4;
            const gridHeight = rect.height / 3;
            
            agent.target = {
              x: (col + 1) * gridWidth + (Math.random() - 0.5) * gridWidth * 0.5,
              y: (row + 1) * gridHeight + (Math.random() - 0.5) * gridHeight * 0.5
            };
          }
        }

        // Apply velocity with damping
        agent.vx *= 0.95;
        agent.vy *= 0.95;
        
        // Update position with improved boundary checking
        const nextX = agent.x + agent.vx;
        const nextY = agent.y + agent.vy;
        
        if (nextX > 10 && nextX < rect.width - 10) {
          agent.x = nextX;
        } else {
          agent.vx *= -0.5; // Bounce off walls
        }
        
        if (nextY > 10 && nextY < rect.height - 10) {
          agent.y = nextY;
        } else {
          agent.vy *= -0.5; // Bounce off walls
        }

        // Only record significant movements for path
        const lastPoint = agent.path[agent.path.length - 1];
        if (!lastPoint || Math.hypot(agent.x - lastPoint.x, agent.y - lastPoint.y) > 5) {
          agent.path.push({ x: agent.x, y: agent.y });
          if (agent.path.length > 20) agent.path.shift(); // Shorter paths
        }
        
        agent.timeOnSite += 1;
      });
    };

    /**
     * Renders all agents and their state indicators
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    const drawAgents = (ctx) => {
      agentsRef.current.forEach(agent => {
        const persona = PERSONAS[agent.persona];
        
        // Draw agent with subtle glow effect
        const gradient = ctx.createRadialGradient(
          agent.x, agent.y, 0,
          agent.x, agent.y, 8
        );
        gradient.addColorStop(0, persona.color.replace('0.8', '0.8'));
        gradient.addColorStop(1, persona.color.replace('0.8', '0'));
        
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw state indicator
        if (agent.state !== INTERACTION_STATES.BROWSING) {
          ctx.beginPath();
          ctx.arc(agent.x, agent.y, 10, 0, Math.PI * 2);
          ctx.strokeStyle = agent.state === INTERACTION_STATES.CART ? 
            'rgba(255, 255, 0, 0.4)' : 'rgba(0, 255, 0, 0.4)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    };

    /**
     * Renders movement paths for all agents
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    const drawPaths = (ctx) => {
      agentsRef.current.forEach(agent => {
        if (agent.path.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(agent.path[0].x, agent.path[0].y);
        
        // Use quadratic curves for smoother paths
        for (let i = 1; i < agent.path.length - 1; i++) {
          const p0 = agent.path[i];
          const p1 = agent.path[i + 1];
          const xc = (p0.x + p1.x) / 2;
          const yc = (p0.y + p1.y) / 2;
          ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
        }

        // More subtle path appearance
        ctx.strokeStyle = `${PERSONAS[agent.persona].color.replace('0.8', '0.1')}`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    };

    /**
     * Updates real-time metrics based on current simulation state
     */
    const updateMetrics = () => {
      const activeUsers = agentsRef.current.length;
      const conversions = agentsRef.current.filter(a => a.state === INTERACTION_STATES.CHECKOUT).length;
      const avgTime = agentsRef.current.reduce((acc, a) => acc + a.timeOnSite, 0) / activeUsers;
      const cartValue = agentsRef.current.reduce((acc, a) => acc + a.cart.reduce((sum, p) => sum + p.price, 0), 0);

      setMetrics({
        activeUsers,
        conversions,
        avgTimeOnSite: Math.round(avgTime / 60),
        cartValue: Math.round(cartValue)
      });
    };

    // Mouse event handlers
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      setMousePosition({
        x: (e.clientX - rect.left) * dpr,
        y: (e.clientY - rect.top) * dpr
      });
    };

    const handleMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const x = (e.clientX - rect.left) * dpr;
      const y = (e.clientY - rect.top) * dpr;
      
      // Check if clicked on a product
      PRODUCTS.forEach((product, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const gridWidth = rect.width / 4;
        const gridHeight = rect.height / 3;
        const productX = (col + 1) * gridWidth;
        const productY = (row + 1) * gridHeight;
        
        if (Math.hypot(x - productX, y - productY) < 50) {
          setSelectedProduct(product);
          // Attract agents to this product
          agentsRef.current.forEach(agent => {
            if (Math.random() < 0.5) {
              agent.target = { x: productX, y: productY };
            }
          });
        }
      });
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);

    // Start animation loop
    updateCanvas();

    // Cleanup on unmount
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
    };
  }, [showHeatmap, abTestActive, interactionMode]);

  return (
    <div ref={containerRef} className="relative w-full h-[600px] bg-black rounded-xl overflow-hidden">
      {/* Main visualization canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
      />
      
      {/* Interaction Controls */}
      <div className="absolute top-4 right-4 flex space-x-2">
        <button
          onClick={() => setInteractionMode(mode => mode === 'attract' ? 'default' : 'attract')}
          className={`px-3 py-1.5 rounded-lg text-sm
            ${interactionMode === 'attract' ? 'bg-green-500' : 'bg-white/10'}`}
        >
          Attract Mode
        </button>
        <button
          onClick={() => setInteractionMode(mode => mode === 'repel' ? 'default' : 'repel')}
          className={`px-3 py-1.5 rounded-lg text-sm
            ${interactionMode === 'repel' ? 'bg-red-500' : 'bg-white/10'}`}
        >
          Repel Mode
        </button>
      </div>

      {/* Product Info Popup */}
      {selectedProduct && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-lg font-bold">{selectedProduct.name}</h3>
          <p className="text-sm opacity-80">${selectedProduct.price}</p>
          <button
            onClick={() => setSelectedProduct(null)}
            className="absolute top-2 right-2 text-sm opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Control Panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4">
        <div className="flex justify-between items-center">
          {/* Feature toggles */}
          <div className="flex space-x-4">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1.5
                ${showHeatmap ? 'bg-laneo-500' : 'bg-white/10'}`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Heatmap</span>
            </button>
            <button
              onClick={() => setAbTestActive(!abTestActive)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1.5
                ${abTestActive ? 'bg-laneo-500' : 'bg-white/10'}`}
            >
              <Layout className="w-4 h-4" />
              <span>A/B Test</span>
            </button>
          </div>
          
          {/* Metrics display */}
          <div className="flex space-x-6">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-laneo-400" />
              <span className="text-sm">{metrics.activeUsers} users</span>
            </div>
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4 text-yellow-400" />
              <span className="text-sm">${metrics.cartValue}</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-green-400" />
              <span className="text-sm">{metrics.conversions} conversions</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveDemo;
