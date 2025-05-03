import React, { useState, useRef } from 'react';

/**
 * A simple tooltip component that appears on hover.
 */
const Tooltip = ({ children, content }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef(null); // Ref to store the timeout ID

  const handleMouseEnter = (e) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Set new position immediately
    setPosition({ x: e.clientX, y: e.clientY });
    // Set a timeout to show the tooltip after 100ms
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 100); // 100ms delay
  };

  const handleMouseLeave = () => {
    // Clear the timeout if the mouse leaves before it triggers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Hide the tooltip immediately
    setIsVisible(false);
  };

  const tooltipStyle = {
    position: 'fixed', // Use fixed to position relative to viewport
    left: `${position.x + 10}px`, // Offset slightly from cursor
    top: `${position.y + 10}px`,
    backgroundColor: 'rgba(50, 50, 50, 0.85)', // Semi-transparent dark gray
    color: 'white',
    padding: '6px 10px', // Slightly larger padding
    borderRadius: '6px', // Slightly larger radius
    fontSize: '12px',
    whiteSpace: 'nowrap',
    zIndex: 1000, // Ensure it's above other elements
    pointerEvents: 'none', // Prevent tooltip from interfering with mouse events
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && content && (
        <div style={tooltipStyle}>
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
