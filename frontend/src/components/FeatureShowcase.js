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
    // Create an equal number of users and bots
    const totalAgents = 50;
    const halfAgents = totalAgents / 2;

    for (let i = 0; i < totalAgents; i++) {
      agents.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: 4,
        color: `hsl(${Math.random() * 60 + 200}, 70%, 50%)`,
        type: i < halfAgents ? 'user' : 'bot',  // Ensure equal distribution
        state: 'browsing', // browsing, cart, checkout
        target: { x: 0, y: 0 },
      });
    }
    return agents;
  };

  const features = [
    {
      icon: Zap,
      title: "Rapid Experimentation",
      description: "Test hundreds of growth hypotheses simultaneously. Get statistically significant results in minutes instead of weeks.",
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

        // Ensure equal distribution of users and bots for each variant
        const userAgents = agents.filter(a => a.type === 'user');
        const botAgents = agents.filter(a => a.type === 'bot');
        
        // Process users and bots separately but with the same logic
        const processAgents = (agentGroup) => {
          return agentGroup.map(agent => {
            // Initialize agent's personal offset if not exists
            if (!agent.offset) {
              agent.offset = {
                x: (Math.random() - 0.5) * 40,
                y: (Math.random() - 0.5) * 40
              };
            }

            // Initialize preferred variant randomly if not set
            if (!agent.preferredVariant) {
              // Ensure equal distribution within each type
              const unassignedToA = agentGroup.filter(a => !a.preferredVariant).length;
              const assignedToA = agentGroup.filter(a => a.preferredVariant === 'A').length;
              const halfGroup = Math.floor(agentGroup.length / 2);
              
              agent.preferredVariant = assignedToA < halfGroup ? 'A' : 'B';
            }

            const preferredVariant = agent.preferredVariant === 'A' ? variantA : variantB;
            const dx = (preferredVariant.x + agent.offset.x) - agent.x;
            const dy = (preferredVariant.y + agent.offset.y) - agent.y;
            const dist = Math.hypot(dx, dy);
            
            return {
              ...agent,
              vx: agent.vx * 0.95 + (dx / dist) * 0.1,
              vy: agent.vy * 0.95 + (dy / dist) * 0.1,
              offset: agent.offset,
              preferredVariant: agent.preferredVariant
            };
          });
        };

        return [...processAgents(userAgents), ...processAgents(botAgents)];
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
      icon: Users,
      title: "User Segment Analysis",
      description: "Understand how different user cohorts interact with your product. Optimize experiences for high-value segments.",
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

        // Ensure equal distribution of users and bots for each attractor
        const userAgents = agents.filter(a => a.type === 'user');
        const botAgents = agents.filter(a => a.type === 'bot');
        
        // Process users and bots separately but with the same logic
        const processAgents = (agentGroup) => {
          return agentGroup.map(agent => {
            // Initialize agent's personal offset if not exists
            if (!agent.offset) {
              agent.offset = {
                x: (Math.random() - 0.5) * 30,
                y: (Math.random() - 0.5) * 30
              };
            }

            // Initialize preferred attractors randomly if not set
            if (!agent.preferredAttractors) {
              // Randomly choose 2 attractors to prefer
              const shuffled = [...attractors].sort(() => Math.random() - 0.5);
              agent.preferredAttractors = shuffled.slice(0, 2);
            }

            // Calculate combined influence of preferred attractors
            const influence = agent.preferredAttractors.reduce((acc, attractor) => {
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

            return {
              ...agent,
              vx: agent.vx * 0.9 + influence.x * 0.2,
              vy: agent.vy * 0.9 + influence.y * 0.2,
              state: nearestDist < 50 ? 'engaged' : 'exploring',
              offset: agent.offset,
              preferredAttractors: agent.preferredAttractors
            };
          });
        };

        return [...processAgents(userAgents), ...processAgents(botAgents)];
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
        const labels = ['Power Users', 'Engaged Users', 'New Users'];
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
      icon: Target,
      title: "Conversion Optimization",
      description: "Identify and fix conversion bottlenecks across your entire funnel. Predict which changes will have the biggest impact on revenue.",
      behavior: (agents, mouse, canvas) => {
        // Define journey touchpoints
        const touchpoints = {
          entry: { x: 80, y: canvas.height / 2 },
          browse: { x: canvas.width * 0.25, y: canvas.height * 0.3 },
          search: { x: canvas.width * 0.25, y: canvas.height * 0.7 },
          product: { x: canvas.width * 0.5, y: canvas.height * 0.4 },
          cart: { x: canvas.width * 0.75, y: canvas.height * 0.3 },
          checkout: { x: canvas.width - 80, y: canvas.height * 0.5 }
        };

        // Define possible paths and their probabilities
        const paths = {
          entry: { next: ['browse', 'search'], probs: [0.6, 0.4] },
          browse: { next: ['product', 'search'], probs: [0.7, 0.3] },
          search: { next: ['product', 'browse'], probs: [0.8, 0.2] },
          product: { next: ['cart', 'browse', 'search'], probs: [0.4, 0.3, 0.3] },
          cart: { next: ['checkout', 'product'], probs: [0.7, 0.3] },
          checkout: { next: ['entry'], probs: [1] }
        };

        return agents.map(agent => {
          // Initialize journey state if not exists
          if (!agent.journeyState) {
            agent.journeyState = {
              current: 'entry',
              target: touchpoints.entry,
              progress: 0,
              speed: 1 + Math.random()
            };
          }

          const state = agent.journeyState;
          
          // Move towards current target
          const dx = state.target.x - agent.x;
          const dy = state.target.y - agent.y;
          const dist = Math.hypot(dx, dy);

          // Transition to next state when reaching target
          if (dist < 5) {
            const path = paths[state.current];
            if (path) {
              // Choose next state based on probabilities
              const rand = Math.random();
              let cumProb = 0;
              let nextState = path.next[0];
              
              for (let i = 0; i < path.probs.length; i++) {
                cumProb += path.probs[i];
                if (rand <= cumProb) {
                  nextState = path.next[i];
                  break;
                }
              }

              state.current = nextState;
              state.target = touchpoints[nextState];
              agent.state = nextState;
            }
          }

          // Add settling behavior - stop movement when very close to target
          if (dist < 2) {
            agent.vx = 0;
            agent.vy = 0;
          } else {
            agent.vx = (dx / dist) * state.speed;
            agent.vy = (dy / dist) * state.speed;
          }

          return {
            ...agent,
            journeyState: state
          };
        });
      },
      label: "Multi-path user journey analysis",
      renderExtra: (ctx, canvas) => {
        const touchpoints = {
          entry: { x: 80, y: canvas.height / 2, label: 'Entry' },
          browse: { x: canvas.width * 0.25, y: canvas.height * 0.3, label: 'Browse' },
          search: { x: canvas.width * 0.25, y: canvas.height * 0.7, label: 'Search' },
          product: { x: canvas.width * 0.5, y: canvas.height * 0.4, label: 'Product' },
          cart: { x: canvas.width * 0.75, y: canvas.height * 0.3, label: 'Cart' },
          checkout: { x: canvas.width - 80, y: canvas.height * 0.5, label: 'Checkout' }
        };

        // Draw connections
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.1)';
        ctx.beginPath();
        // Entry to Browse/Search
        ctx.moveTo(touchpoints.entry.x, touchpoints.entry.y);
        ctx.lineTo(touchpoints.browse.x, touchpoints.browse.y);
        ctx.moveTo(touchpoints.entry.x, touchpoints.entry.y);
        ctx.lineTo(touchpoints.search.x, touchpoints.search.y);
        // Browse/Search to Product
        ctx.moveTo(touchpoints.browse.x, touchpoints.browse.y);
        ctx.lineTo(touchpoints.product.x, touchpoints.product.y);
        ctx.moveTo(touchpoints.search.x, touchpoints.search.y);
        ctx.lineTo(touchpoints.product.x, touchpoints.product.y);
        // Product to Cart
        ctx.moveTo(touchpoints.product.x, touchpoints.product.y);
        ctx.lineTo(touchpoints.cart.x, touchpoints.cart.y);
        // Cart to Checkout
        ctx.moveTo(touchpoints.cart.x, touchpoints.cart.y);
        ctx.lineTo(touchpoints.checkout.x, touchpoints.checkout.y);
        ctx.stroke();

        // Draw touchpoints
        Object.values(touchpoints).forEach(point => {
          // Draw node
          ctx.beginPath();
          ctx.arc(point.x, point.y, 15, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(100, 200, 255, 0.1)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
          ctx.stroke();

          // Draw label
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(point.label, point.x, point.y + 30);
        });
      }
    },
    {
      icon: Brain,
      title: "Virality & Network Effects",
      description: "Visualize how value grows exponentially through network effects. See how individual actions create collective impact and viral growth patterns.",
      behavior: (agents, mouse, canvas) => {
        // Initialize wave emitters if not exists
        agents.forEach(agent => {
          if (!agent.waveState) {
            agent.waveState = {
              frequency: 0.5 + Math.random() * 0.5,
              amplitude: 30 + Math.random() * 20,
              phase: Math.random() * Math.PI * 2,
              role: Math.random() < 0.2 ? 'creator' : 
                    Math.random() < 0.5 ? 'amplifier' : 'connector',
              connections: [],
              lastEmission: 0,
              emissionInterval: 50 + Math.random() * 100,
              preferredZone: Math.floor(Math.random() * 3) // Assign to one of three zones
            };
          }
        });

        // Define resonance zones
        const zones = [
          { x: canvas.width / 2, y: canvas.height / 2, radius: 100 },
          { x: canvas.width / 2 + 150, y: canvas.height / 2 - 50, radius: 80 },
          { x: canvas.width / 2 - 120, y: canvas.height / 2 + 70, radius: 70 }
        ];
        
        return agents.map(agent => {
          const state = agent.waveState;
          const zone = zones[state.preferredZone];
          
          // Calculate wave influence
          const waveX = Math.cos(time * 0.01 * state.frequency + state.phase) * state.amplitude;
          const waveY = Math.sin(time * 0.01 * state.frequency + state.phase) * state.amplitude;
          
          // Different behavior based on role
          switch(state.role) {
            case 'creator':
              // Creators move in larger, slower patterns within their zone
              const creatorDx = zone.x - agent.x;
              const creatorDy = zone.y - agent.y;
              const creatorDist = Math.hypot(creatorDx, creatorDy);
              
              // Add settling behavior for creators
              if (creatorDist < 2) {
                agent.vx = 0;
                agent.vy = 0;
              } else if (creatorDist > zone.radius) {
                agent.vx = agent.vx * 0.9 + (creatorDx / creatorDist) * 0.5;
                agent.vy = agent.vy * 0.9 + (creatorDy / creatorDist) * 0.5;
              } else {
                agent.vx = agent.vx * 0.95 + waveX * 0.005;
                agent.vy = agent.vy * 0.95 + waveY * 0.005;
              }
              agent.size = 6;
              break;
            case 'amplifier':
              // Amplifiers are attracted to their zone center
              const amplifierDx = zone.x + waveX * 0.5 - agent.x;
              const amplifierDy = zone.y + waveY * 0.5 - agent.y;
              const amplifierDist = Math.hypot(amplifierDx, amplifierDy);
              
              // Add settling behavior for amplifiers
              if (amplifierDist < 2) {
                agent.vx = 0;
                agent.vy = 0;
              } else {
                agent.vx = agent.vx * 0.9 + (amplifierDx / amplifierDist) * 0.1;
                agent.vy = agent.vy * 0.9 + (amplifierDy / amplifierDist) * 0.1;
              }
              agent.size = 4;
              break;
            case 'connector':
              // Connectors move between agents in their zone
              const nearbyAgents = agents.filter(other => 
                other !== agent && 
                other.waveState.preferredZone === state.preferredZone &&
                Math.hypot(other.x - agent.x, other.y - agent.y) < zone.radius * 1.2
              );
              
              if (nearbyAgents.length > 0) {
                nearbyAgents.forEach(potentialTarget => {
                  if (!state.connections.includes(potentialTarget)) {
                    state.connections.push(potentialTarget);
                    if (state.connections.length > 24) {
                      state.connections.shift();
                    }
                  }
                });

                // Move towards a random target with settling behavior
                const target = nearbyAgents[Math.floor(Math.random() * nearbyAgents.length)];
                const tdx = target.x - agent.x;
                const tdy = target.y - agent.y;
                const tdist = Math.hypot(tdx, tdy);
                
                if (tdist < 2) {
                  agent.vx = 0;
                  agent.vy = 0;
                } else {
                  agent.vx = agent.vx * 0.9 + (tdx / tdist) * 0.15;
                  agent.vy = agent.vy * 0.9 + (tdy / tdist) * 0.15;
                }

                // Add attraction between connected agents with settling behavior
                state.connections.forEach(connectedAgent => {
                  const dx = connectedAgent.x - agent.x;
                  const dy = connectedAgent.y - agent.y;
                  const dist = Math.hypot(dx, dy);
                  if (dist > 2) {
                    const force = 0.03;
                    agent.vx += (dx / dist) * force;
                    agent.vy += (dy / dist) * force;
                    connectedAgent.vx -= (dx / dist) * force;
                    connectedAgent.vy -= (dy / dist) * force;
                  }
                });
              } else {
                // Return to zone center with settling behavior
                const returnDx = zone.x - agent.x;
                const returnDy = zone.y - agent.y;
                const returnDist = Math.hypot(returnDx, returnDy);
                
                if (returnDist < 2) {
                  agent.vx = 0;
                  agent.vy = 0;
                } else {
                  agent.vx = agent.vx * 0.9 + (returnDx / returnDist) * 0.1;
                  agent.vy = agent.vy * 0.9 + (returnDy / returnDist) * 0.1;
                }
              }
              agent.size = 3;
              break;
          }

          // Update connections decay
          state.connections = state.connections.filter(other => 
            Math.hypot(other.x - agent.x, other.y - agent.y) < zone.radius
          );

          return {
            ...agent,
            waveState: state
          };
        });
      },
      label: "Visualizing network effects and viral growth patterns",
      renderExtra: (ctx, canvas) => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Define resonance zones with titles
        const zones = [
          { 
            x: centerX, 
            y: centerY, 
            radius: 100 + Math.sin(time * 0.002) * 20,
            title: "Early Adopters Hub"
          },
          { 
            x: centerX + 150, 
            y: centerY - 50, 
            radius: 80 + Math.cos(time * 0.003) * 15,
            title: "Growth Catalysts"
          },
          { 
            x: centerX - 120, 
            y: centerY + 70, 
            radius: 70 + Math.sin(time * 0.004) * 10,
            title: "Network Amplifiers"
          }
        ];

        // Draw wave interference patterns
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 360; i += 5) {
          const angle = (i * Math.PI) / 180;
          const wave1 = Math.sin(angle * 4 + time * 0.002) * 100;
          const wave2 = Math.cos(angle * 3 - time * 0.003) * 80;
          const combinedWave = wave1 + wave2;
          
          const x = centerX + Math.cos(angle) * combinedWave;
          const y = centerY + Math.sin(angle) * combinedWave;
          
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(x, y);
          ctx.strokeStyle = `hsla(${200 + combinedWave}, 70%, 50%, 0.1)`;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Draw resonance zones with titles
        zones.forEach(zone => {
          // Draw zone
          ctx.beginPath();
          ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(100, 200, 255, 0.05)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.1)';
          ctx.stroke();

          // Draw zone title
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(zone.title, zone.x, zone.y - zone.radius - 10);
        });

        // Draw network connections from connectors
        if (agentsRef.current) {
          agentsRef.current.forEach(agent => {
            if (agent.waveState?.role === 'connector' && agent.waveState.connections.length > 0) {
              agent.waveState.connections.forEach(other => {
                ctx.beginPath();
                ctx.moveTo(agent.x, agent.y);
                ctx.lineTo(other.x, other.y);
                ctx.strokeStyle = 'rgba(100, 200, 255, 0.05)';  // Made connections more subtle since there are more
                ctx.stroke();
              });
            }
          });
        }
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
                <div className="flex items-center justify-center space-x-8">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-400 mr-2"></div>
                    <span className="text-sm text-gray-400">Real Users</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-white/50 mr-2"></div>
                    <span className="text-sm text-gray-400">AI Simulations</span>
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