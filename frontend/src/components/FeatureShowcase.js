import React, { useState, useEffect, useRef } from 'react';
import { Brain, Zap, Target, Users } from 'lucide-react';

const FeatureShowcase = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const featureListRef = useRef(null);
  const agentsRef = useRef([]);
  const frameRef = useRef(null);
  const [time, setTime] = useState(0);
  const [listHeight, setListHeight] = useState(0);

  const initializeAgents = () => {
    const agents = [];
    // Create fewer agents for clarity
    for (let i = 0; i < 30; i++) {
      agents.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: 4,
        color: `hsl(${Math.random() * 60 + 200}, 70%, 50%)`,
        type: Math.random() > 0.5 ? 'user' : 'bot',
        state: 'browsing', // browsing, cart, checkout
        target: { x: 0, y: 0 },
      });
    }
    return agents;
  };

  const features = [
    {
      icon: Brain,
      title: "Behavioral Pattern Recognition",
      description: "Discover how different user segments naturally interact with your interface and identify emerging behavior patterns.",
      behavior: (agents, mouse, canvas) => {
        // Create animated positions for the attractors
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 100;
        const speed = 0.001;
        
        const attractors = [
          {
            x: centerX + Math.cos(time * speed) * radius,
            y: centerY + Math.sin(time * speed) * radius,
            strength: 1,
            label: 'Feature A',
            radius: 40  // Area of influence
          },
          {
            x: centerX + Math.cos(time * speed + (2 * Math.PI / 3)) * radius,
            y: centerY + Math.sin(time * speed + (2 * Math.PI / 3)) * radius,
            strength: 0.7,
            label: 'Feature B',
            radius: 35
          },
          {
            x: centerX + Math.cos(time * speed + (4 * Math.PI / 3)) * radius,
            y: centerY + Math.sin(time * speed + (4 * Math.PI / 3)) * radius,
            strength: 0.5,
            label: 'Feature C',
            radius: 30
          }
        ];

        return agents.map(agent => {
          // Initialize agent's personal offset if not exists
          if (!agent.offset) {
            agent.offset = {
              x: (Math.random() - 0.5) * 30,
              y: (Math.random() - 0.5) * 30
            };
          }

          // Each agent type has different behavioral tendencies
          const preferredAttractors = agent.type === 'bot' 
            ? attractors.slice(0, 2)  // AI users prefer first two areas
            : attractors.slice(1);     // Real users prefer last two areas

          // Calculate combined influence of preferred attractors
          const influence = preferredAttractors.reduce((acc, attractor) => {
            const dx = (attractor.x + agent.offset.x) - agent.x;
            const dy = (attractor.y + agent.offset.y) - agent.y;
            const dist = Math.hypot(dx, dy);
            const factor = attractor.strength / (dist + 1);
            return {
              x: acc.x + (dx * factor),
              y: acc.y + (dy * factor)
            };
          }, { x: 0, y: 0 });

          // Calculate distance to nearest attractor for engagement state
          const nearestDist = Math.min(...attractors.map(attractor => 
            Math.hypot(attractor.x - agent.x, attractor.y - agent.y)
          ));

          // Update velocity based on behavioral influences
          return {
            ...agent,
            vx: agent.vx * 0.9 + influence.x * 0.2,
            vy: agent.vy * 0.9 + influence.y * 0.2,
            state: nearestDist < 50 ? 'engaged' : 'exploring',
            offset: agent.offset  // Preserve the offset
          };
        });
      },
      label: "Identifying natural user behavior patterns",
      renderExtra: (ctx, canvas) => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 100;
        const speed = 0.001;

        // Draw orbital path
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.1)';
        ctx.stroke();

        // Draw attractors
        const positions = [0, (2 * Math.PI / 3), (4 * Math.PI / 3)];
        const labels = ['Primary', 'Secondary', 'Tertiary'];
        const sizes = [100, 80, 60];

        positions.forEach((angle, i) => {
          const x = centerX + Math.cos(time * speed + angle) * radius;
          const y = centerY + Math.sin(time * speed + angle) * radius;

          // Draw influence area
          ctx.beginPath();
          ctx.arc(x, y, sizes[i] * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(100, 200, 255, 0.1)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
          ctx.stroke();

          // Draw label
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(labels[i], x, y + 40);
        });
      }
    },
    {
      icon: Users,
      title: "User Flow Analysis",
      description: "Map out complete user journeys and identify critical paths, bottlenecks, and drop-off points in your application.",
      behavior: (agents, mouse, canvas) => {
        // Define key interaction points in the user flow
        const flowStages = [
          { x: 100, y: 100, name: 'entry', next: ['explore', 'search'], radius: 30 },
          { x: canvas.width - 100, y: 100, name: 'search', next: ['detail'], radius: 30 },
          { x: canvas.width/2, y: canvas.height/2, name: 'explore', next: ['detail', 'search'], radius: 40 },
          { x: canvas.width - 100, y: canvas.height - 100, name: 'detail', next: ['action'], radius: 30 },
          { x: 100, y: canvas.height - 100, name: 'action', next: ['complete'], radius: 30 },
          { x: canvas.width/2, y: canvas.height - 50, name: 'complete', next: [], radius: 30 }
        ];

        return agents.map(agent => {
          // Initialize agent's personal offset if not exists
          if (!agent.offset) {
            agent.offset = {
              x: (Math.random() - 0.5) * 30,
              y: (Math.random() - 0.5) * 30
            };
          }

          // Initialize or update agent's flow state
          if (!agent.flowState) {
            agent.flowState = 'entry';
            agent.target = flowStages.find(s => s.name === 'entry');
          }

          const currentStage = flowStages.find(s => s.name === agent.flowState);
          
          // Transition to next stage when close enough
          if (Math.hypot(agent.x - (currentStage.x + agent.offset.x), 
                        agent.y - (currentStage.y + agent.offset.y)) < currentStage.radius) {
            if (currentStage.next.length > 0 && Math.random() < 0.03) {
              const nextOptions = currentStage.next;
              const nextStageName = nextOptions[Math.floor(Math.random() * nextOptions.length)];
              agent.target = flowStages.find(s => s.name === nextStageName);
              agent.flowState = nextStageName;
              // Generate new offset when changing stages
              agent.offset = {
                x: (Math.random() - 0.5) * 30,
                y: (Math.random() - 0.5) * 30
              };
            }
          }

          const dx = (agent.target.x + agent.offset.x) - agent.x;
          const dy = (agent.target.y + agent.offset.y) - agent.y;
          const dist = Math.hypot(dx, dy);

          return {
            ...agent,
            vx: agent.vx * 0.95 + (dx / dist) * 0.1,
            vy: agent.vy * 0.95 + (dy / dist) * 0.1,
            offset: agent.offset
          };
        });
      },
      label: "Mapping user flow patterns",
      renderExtra: (ctx, canvas) => {
        // Draw flow diagram
        const stages = [
          { x: 100, y: 100, label: 'Entry' },
          { x: canvas.width - 100, y: 100, label: 'Search' },
          { x: canvas.width/2, y: canvas.height/2, label: 'Explore' },
          { x: canvas.width - 100, y: canvas.height - 100, label: 'Details' },
          { x: 100, y: canvas.height - 100, label: 'Action' },
          { x: canvas.width/2, y: canvas.height - 50, label: 'Complete' }
        ];

        // Draw connections between stages
        ctx.beginPath();
        ctx.moveTo(stages[0].x, stages[0].y);
        stages.forEach((stage, i) => {
          if (i > 0) {
            ctx.lineTo(stage.x, stage.y);
          }
        });
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
        ctx.stroke();

        // Draw stages
        stages.forEach(stage => {
          ctx.beginPath();
          ctx.arc(stage.x, stage.y, 30, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(100, 200, 255, 0.1)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(stage.label, stage.x, stage.y + 45);
        });
      }
    },
    {
      icon: Target,
      title: "A/B Testing at Scale",
      description: "Test multiple variations of your UI with thousands of simulated users to predict the best performing designs.",
      behavior: (agents, mouse, canvas) => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const separation = 200;
        const yOffset = Math.sin(time * 0.002) * 20;

        const variantA = { 
          x: centerX - separation / 2,
          y: centerY + yOffset,
          radius: 40
        };
        const variantB = { 
          x: centerX + separation / 2,
          y: centerY - yOffset,
          radius: 40
        };
        
        return agents.map(agent => {
          // Initialize agent's personal offset if not exists
          if (!agent.offset) {
            agent.offset = {
              x: (Math.random() - 0.5) * 40,
              y: (Math.random() - 0.5) * 40
            };
          }

          const preferredVariant = agent.type === 'bot' ? variantA : variantB;
          const dx = (preferredVariant.x + agent.offset.x) - agent.x;
          const dy = (preferredVariant.y + agent.offset.y) - agent.y;
          const dist = Math.hypot(dx, dy);
          
          return {
            ...agent,
            vx: agent.vx * 0.95 + (dx / dist) * 0.1,
            vy: agent.vy * 0.95 + (dy / dist) * 0.1,
            offset: agent.offset
          };
        });
      },
      label: "Comparing UI variations with simulated users",
      renderExtra: (ctx, canvas) => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const separation = 200;
        const yOffset = Math.sin(time * 0.002) * 20;

        // Draw connecting line
        ctx.beginPath();
        ctx.moveTo(centerX - separation / 2, centerY + yOffset);
        ctx.lineTo(centerX + separation / 2, centerY - yOffset);
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.1)';
        ctx.stroke();

        // Draw variants
        [
          { x: centerX - separation / 2, y: centerY + yOffset, label: 'Variant A' },
          { x: centerX + separation / 2, y: centerY - yOffset, label: 'Variant B' }
        ].forEach(variant => {
          // Draw influence area
          ctx.beginPath();
          ctx.arc(variant.x, variant.y, 80, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(100, 200, 255, 0.1)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
          ctx.stroke();

          // Draw label
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(variant.label, variant.x, variant.y + 100);
        });
      }
    },
    {
      icon: Zap,
      title: "Conversion Optimization",
      description: "Identify and fix conversion bottlenecks by analyzing user behavior patterns.",
      behavior: (agents, mouse, canvas) => {
        // Simulate conversion funnel
        const stages = [
          { x: 100, y: canvas.height / 2 },
          { x: canvas.width / 3, y: canvas.height / 2 },
          { x: (2 * canvas.width) / 3, y: canvas.height / 2 },
          { x: canvas.width - 100, y: canvas.height / 2 }
        ];

        return agents.map(agent => {
          // Progress through funnel stages
          if (!agent.funnelStage) agent.funnelStage = 0;
          
          const currentStage = stages[agent.funnelStage];
          const dx = currentStage.x - agent.x;
          const dy = currentStage.y - agent.y;
          const dist = Math.hypot(dx, dy);

          // Move to next stage with some probability
          if (dist < 20 && agent.funnelStage < stages.length - 1 && Math.random() < 0.02) {
            agent.funnelStage++;
          }

          return {
            ...agent,
            vx: agent.vx * 0.95 + (dx / dist) * 0.1,
            vy: agent.vy * 0.95 + (dy / dist) * 0.1
          };
        });
      },
      label: "Analyzing conversion funnel performance",
      renderExtra: (ctx, canvas) => {
        // Draw conversion funnel stages
        const stages = [
          { x: 100, label: 'Visit' },
          { x: canvas.width / 3, label: 'Engage' },
          { x: (2 * canvas.width) / 3, label: 'Convert' },
          { x: canvas.width - 100, label: 'Retain' }
        ];

        // Draw connecting lines
        ctx.beginPath();
        ctx.moveTo(stages[0].x, canvas.height / 2);
        ctx.lineTo(stages[stages.length - 1].x, canvas.height / 2);
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
        ctx.stroke();

        stages.forEach(stage => {
          ctx.beginPath();
          ctx.arc(stage.x, canvas.height / 2, 30, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(100, 200, 255, 0.1)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(stage.label, stage.x, canvas.height / 2 + 45);
        });
      }
    }
  ];

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    agentsRef.current = initializeAgents();

    const updateCanvas = () => {
      if (!canvas) return;
      
      // Get the display size of the canvas
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      // Set high DPI support
      const dpr = window.devicePixelRatio || 1;
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      
      // Scale the context for high DPI display
      ctx.scale(dpr, dpr);
      
      // Clear with slight trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Initialize agents if needed with display dimensions
      if (agentsRef.current.length === 0) {
        agentsRef.current = Array.from({ length: 30 }, () => ({
          x: Math.random() * displayWidth,
          y: Math.random() * displayHeight,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size: 4,
          type: Math.random() > 0.5 ? 'user' : 'bot',
          state: 'browsing',
          target: { x: 0, y: 0 },
        }));
      }

      // Draw extra visualization elements with display dimensions
      features[activeFeature].renderExtra(ctx, { width: displayWidth, height: displayHeight });

      // Update and draw agents with display dimensions
      agentsRef.current = features[activeFeature].behavior(
        agentsRef.current, 
        null, 
        { width: displayWidth, height: displayHeight }
      );
      
      // Apply velocity limits
      agentsRef.current = agentsRef.current.map(agent => ({
        ...agent,
        vx: Math.max(-1, Math.min(1, agent.vx)),
        vy: Math.max(-1, Math.min(1, agent.vy)),
      }));

      agentsRef.current.forEach(agent => {
        // Update position
        agent.x += agent.vx;
        agent.y += agent.vy;

        // Bounce off walls with dampening
        if (agent.x < 0 || agent.x > displayWidth) {
          agent.vx *= -0.5;
          agent.x = Math.max(0, Math.min(displayWidth, agent.x));
        }
        if (agent.y < 0 || agent.y > displayHeight) {
          agent.vy *= -0.5;
          agent.y = Math.max(0, Math.min(displayHeight, agent.y));
        }

        // Draw agent with state-based colors
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, agent.size, 0, Math.PI * 2);
        
        // Color based on state/type
        let color;
        if (agent.state === 'cart') {
          color = 'rgba(255, 200, 100, 0.8)';
        } else if (agent.state === 'checkout') {
          color = 'rgba(100, 255, 100, 0.8)';
        } else {
          color = agent.type === 'user' ? 'rgba(100, 200, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)';
        }
        
        ctx.fillStyle = color;
        ctx.fill();
      });

      frameRef.current = requestAnimationFrame(updateCanvas);
    };

    updateCanvas();

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [activeFeature]);

  useEffect(() => {
    if (!isHovering) {
      const interval = setInterval(() => {
        setActiveFeature((prev) => (prev + 1) % features.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isHovering, features.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => t + 1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (featureListRef.current) {
      const updateHeight = () => {
        const height = featureListRef.current.getBoundingClientRect().height;
        setListHeight(height);
      };

      updateHeight();
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }
  }, []);

  return (
    <div className="relative w-full max-w-6xl mx-auto" ref={containerRef}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Feature List */}
        <div className="lg:col-span-5 space-y-4" ref={featureListRef}>
          {features.map((feature, index) => (
            <div
              key={index}
              className={`p-6 rounded-xl transition-all duration-300 cursor-pointer
                ${activeFeature === index 
                  ? 'bg-white/10 backdrop-blur-lg transform scale-105' 
                  : 'bg-white/5 hover:bg-white/10'}`}
              onMouseEnter={() => {
                setActiveFeature(index);
                setIsHovering(true);
              }}
              onMouseLeave={() => setIsHovering(false)}
            >
              <div className="flex items-start space-x-4">
                <feature.icon className={`w-6 h-6 ${activeFeature === index ? 'text-laneo-400' : 'text-gray-400'}`} />
                <div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Canvas Display */}
        <div className="lg:col-span-7">
          <div className="relative bg-black/50 rounded-xl overflow-hidden backdrop-blur-lg" style={{ height: `${listHeight}px` }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: 'calc(100% - 80px)' }}
            />
            
            {/* Labels inside canvas container */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/30 backdrop-blur-sm">
              <div className="flex flex-col items-center space-y-2">
                <p className="text-sm text-white">{features[activeFeature].label}</p>
                <div className="flex items-center justify-center space-x-8">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-400 mr-2"></div>
                    <span className="text-xs text-gray-400">Real Users</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-white/50 mr-2"></div>
                    <span className="text-xs text-gray-400">AI Simulations</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureShowcase; 