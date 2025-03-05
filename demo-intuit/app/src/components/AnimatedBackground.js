import React, { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;
    let frame;
    let time = 0;
    
    // Create floating orbs
    const orbs = Array.from({ length: 5 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 100 + 50,
      speed: Math.random() * 0.5 + 0.2,
      offset: Math.random() * Math.PI * 2,
    }));

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const drawGrid = () => {
      ctx.strokeStyle = '#4f4f4f2e';
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let x = 0; x < canvas.width; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let y = 0; y < canvas.height; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };

    const animate = () => {
      time += 0.01;
      
      // Smooth follow for mouse light
      currentX += (mouseX - currentX) * 0.05;
      currentY += (mouseY - currentY) * 0.05;
      
      if (container && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        drawGrid();
        
        // Update and draw orbs
        orbs.forEach((orb, i) => {
          // Update position with a floating motion
          orb.x += Math.cos(time + orb.offset) * orb.speed;
          orb.y += Math.sin(time + orb.offset) * orb.speed;
          
          // Wrap around screen
          if (orb.x > canvas.width + orb.size) orb.x = -orb.size;
          if (orb.x < -orb.size) orb.x = canvas.width + orb.size;
          if (orb.y > canvas.height + orb.size) orb.y = -orb.size;
          if (orb.y < -orb.size) orb.y = canvas.height + orb.size;
          
          // Create gradient for each orb
          const gradient = ctx.createRadialGradient(
            orb.x, orb.y, 0,
            orb.x, orb.y, orb.size
          );
          gradient.addColorStop(0, `rgba(12, 150, 235, ${0.08 + Math.sin(time + i) * 0.03})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        });
        
        // Mouse light effect
        const rect = canvas.getBoundingClientRect();
        const x = ((currentX - rect.left) / rect.width) * canvas.width;
        const y = ((currentY - rect.top) / rect.height) * canvas.height;
        
        // Create larger, more intense mouse gradient
        const mouseGradient = ctx.createRadialGradient(
          x, y, 0,
          x, y, 400
        );
        
        // Adjusted gradient stops for better balance
        mouseGradient.addColorStop(0, 'rgba(12, 150, 235, 0.4)');    // Reduced from 0.8
        mouseGradient.addColorStop(0.2, 'rgba(12, 150, 235, 0.2)');  // Adjusted position and opacity
        mouseGradient.addColorStop(0.6, 'rgba(12, 150, 235, 0.05)'); // Extended fade
        mouseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = mouseGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Softer inner glow
        const innerGlow = ctx.createRadialGradient(
          x, y, 0,
          x, y, 80  // Increased size for softer effect
        );
        innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.1)');  // Reduced from 0.2
        innerGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');  // Added middle stop
        innerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = innerGlow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      frame = requestAnimationFrame(animate);
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full transition-opacity duration-1000"
        style={{ opacity: 0.9 }}  // Slightly increased overall opacity
      />
    </div>
  );
};

export default AnimatedBackground; 