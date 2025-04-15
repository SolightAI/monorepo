import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Users } from 'lucide-react';

const SimulationDemo = () => {
  const canvasRef = useRef(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [userCount, setUserCount] = useState(0);
  const [hoveredParticle, setHoveredParticle] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    let mouseX = 0;
    let mouseY = 0;

    const setCanvasSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      setMousePos({ x: mouseX, y: mouseY });
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    class Particle {
      constructor(type) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 2;
        this.baseSpeed = Math.random() * 1 + 0.5;
        this.speedX = (Math.random() - 0.5) * this.baseSpeed;
        this.speedY = (Math.random() - 0.5) * this.baseSpeed;
        this.type = type || Math.random() > 0.7 ? 'power' : 'regular';
        this.color = this.type === 'power'
          ? 'hsla(210, 100%, 60%, 0.8)'
          : 'hsla(190, 70%, 50%, 0.6)';
        this.interactions = [];
        this.lastInteraction = Date.now();
      }

      update() {
        // Add slight attraction to mouse
        if (Math.hypot(mouseX - this.x, mouseY - this.y) < 100) {
          const angle = Math.atan2(mouseY - this.y, mouseX - this.x);
          this.speedX += Math.cos(angle) * 0.1;
          this.speedY += Math.sin(angle) * 0.1;
        }

        this.x += this.speedX;
        this.y += this.speedY;

        // Boundary checking with smooth transition
        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;

        // Simulate interactions between particles
        if (this.type === 'power' && Date.now() - this.lastInteraction > 1000) {
          particles.forEach(particle => {
            if (particle !== this && particle.type === 'regular') {
              const distance = Math.hypot(particle.x - this.x, particle.y - this.y);
              if (distance < 50) {
                this.interactions.push({
                  x: (particle.x + this.x) / 2,
                  y: (particle.y + this.y) / 2,
                  time: Date.now()
                });
                this.lastInteraction = Date.now();
              }
            }
          });
        }

        // Clean up old interactions
        this.interactions = this.interactions.filter(i => Date.now() - i.time < 1000);
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw interaction lines
        this.interactions.forEach(interaction => {
          const age = Date.now() - interaction.time;
          const opacity = 1 - (age / 1000);
          ctx.strokeStyle = `hsla(210, 100%, 60%, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(interaction.x, interaction.y);
          ctx.stroke();
        });
      }

      isUnderMouse() {
        return Math.hypot(mouseX - this.x, mouseY - this.y) < this.size;
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < 50; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.update();
        particle.draw();

        if (particle.isUnderMouse()) {
          setHoveredParticle(particle);
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    if (isSimulating) {
      init();
      animate();

      const interval = setInterval(() => {
        setUserCount(prev => {
          const newCount = prev + Math.floor(Math.random() * 10);
          return newCount > 1000 ? 0 : newCount;
        });
      }, 100);

      return () => {
        clearInterval(interval);
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', setCanvasSize);
        canvas.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [isSimulating]);

  return (
    <div className="relative">
      {/* Explanation Overlay */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Users className="text-solight-400" />
            <div>
              <p className="text-sm font-mono">Simulated Users: {userCount}</p>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Power Users</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Regular Users</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsSimulating(prev => !prev)}
            className="px-4 py-2 rounded-full bg-solight-500/20 hover:bg-solight-500/30 backdrop-blur-sm
              transition-colors flex items-center space-x-2"
          >
            {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="text-sm">{isSimulating ? 'Pause' : 'Start'} Simulation</span>
          </button>
        </div>
      </div>

      <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
        />

        {/* Hover tooltip */}
        {hoveredParticle && (
          <div className="absolute pointer-events-none bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg
            text-xs transform -translate-x-1/2 -translate-y-full"
            style={{ left: mousePos.x, top: mousePos.y }}
          >
            {hoveredParticle.type === 'power' ? 'Power User' : 'Regular User'}
            <div className="text-gray-400">
              Interactions: {hoveredParticle.interactions.length}
            </div>
          </div>
        )}
      </div>

      {/* Explanation Panel */}
      <div className="mt-4 p-4 bg-white/5 rounded-lg backdrop-blur-sm">
        <h4 className="text-lg font-semibold mb-2">What you're seeing:</h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• Blue dots represent power users, cyan dots are regular users</li>
          <li>• Lines appear when users interact with each other</li>
          <li>• Hover over dots to see user details</li>
          <li>• Move your mouse to influence user behavior</li>
        </ul>
      </div>
    </div>
  );
};

export default SimulationDemo;
