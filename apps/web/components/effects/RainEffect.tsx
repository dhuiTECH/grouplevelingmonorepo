'use client';

import React from 'react';

// Rain Effect Component
const RainEffect = () => {
  // Generate 200 rain drops for a dramatic effect
  const rainDrops = Array.from({ length: 200 }, (_, i) => ({
    id: i,
    left: Math.random() * 100, // Random horizontal position (0-100%)
    delay: Math.random() * 3, // Random delay (0-3s)
    duration: 0.6 + Math.random() * 1.8, // Random duration (0.6-2.4s)
  }));

  return (
    <div className="rain-container">
      {rainDrops.map((drop) => (
        <div
          key={drop.id}
          className="rain-drop"
          style={{
            left: `${drop.left}%`,
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

export default RainEffect;