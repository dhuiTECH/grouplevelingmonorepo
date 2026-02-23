"use client";

import React, { useEffect, useRef } from 'react';

const ParallaxBackground = () => {
  const bgRef = useRef<HTMLDivElement>(null);
  const frameId = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (frameId.current) cancelAnimationFrame(frameId.current);

      frameId.current = requestAnimationFrame(() => {
        if (!bgRef.current) return;
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;
        bgRef.current.style.transform = `translate(${x * -0.5}px, ${y * -0.5}px)`;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (frameId.current) cancelAnimationFrame(frameId.current);
    };
  }, []);

  return (
    <div
      ref={bgRef}
      className="fixed inset-0 bg-[url('/bg1m.webp')] md:bg-[url('/bg1.webp')] bg-cover bg-center bg-no-repeat z-0 pointer-events-none"
      style={{
        filter: 'blur(3px)',
        willChange: 'transform'
      }}
    />
  );
};

export default ParallaxBackground;
