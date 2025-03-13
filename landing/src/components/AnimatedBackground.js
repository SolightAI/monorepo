import React, { useEffect, useRef } from 'react';

const AnimatedBackground = ({ theme = 'light' }) => {
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
      ctx.strokeStyle = theme === 'light' ? '#1a1a1a1a' : '#4f4f4f2e';
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

          // Create gradient for each orb - darker blue for light theme
          const gradient = ctx.createRadialGradient(
            orb.x, orb.y, 0,
            orb.x, orb.y, orb.size
          );

          if (theme === 'light') {
            // Darker blue with higher opacity for light theme
            gradient.addColorStop(0, `rgba(0, 90, 180, ${0.12 + Math.sin(time + i) * 0.04})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          } else {
            // Original colors for dark theme
            gradient.addColorStop(0, `rgba(12, 150, 235, ${0.08 + Math.sin(time + i) * 0.03})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          }

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

        if (theme === 'light') {
          // Darker blue with higher contrast for light theme
          mouseGradient.addColorStop(0, 'rgba(0, 90, 180, 0.5)');
          mouseGradient.addColorStop(0.2, 'rgba(0, 90, 180, 0.25)');
          mouseGradient.addColorStop(0.6, 'rgba(0, 90, 180, 0.08)');
          mouseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          // Original colors for dark theme
          mouseGradient.addColorStop(0, 'rgba(12, 150, 235, 0.4)');
          mouseGradient.addColorStop(0.2, 'rgba(12, 150, 235, 0.2)');
          mouseGradient.addColorStop(0.6, 'rgba(12, 150, 235, 0.05)');
          mouseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }

        ctx.fillStyle = mouseGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Softer inner glow
        const innerGlow = ctx.createRadialGradient(
          x, y, 0,
          x, y, 80
        );

        if (theme === 'light') {
          // Darker inner glow for light theme
          innerGlow.addColorStop(0, 'rgba(0, 60, 120, 0.15)');
          innerGlow.addColorStop(0.5, 'rgba(0, 60, 120, 0.08)');
          innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          // Original colors for dark theme
          innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
          innerGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
          innerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }

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
  }, [theme]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full transition-opacity duration-1000"
        style={{ opacity: theme === 'light' ? 0.7 : 0.9 }}  // Lower opacity for light theme
      />
    </div>
  );
};

export default AnimatedBackground;
