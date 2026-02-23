'use client';

import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine, IOptions, RecursivePartial } from '@tsparticles/engine';

interface BackgroundParticlesProps {
  className?: string;
}

export default function BackgroundParticles({ className = '' }: BackgroundParticlesProps) {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = async (container?: any): Promise<void> => {
    console.log('Particles loaded:', container);
  };

  const options = useMemo(
    () => ({
      background: {
        color: {
          value: 'transparent',
        },
      },
      fpsLimit: 120,
      interactivity: {
        events: {
          onClick: {
            enable: false,
          },
          onHover: {
            enable: false,
          },
        },
        modes: {
          push: {
            quantity: 4,
          },
          repulse: {
            distance: 200,
            duration: 0.4,
          },
        },
      },
      particles: {
        color: {
          value: '#00d1ff', // Neon blue/cyan
        },
        links: {
          color: '#00d1ff',
          distance: 150,
          enable: false, // Disable links for floating dust effect
          opacity: 0.1,
          width: 1,
        },
        move: {
          direction: 'top', // Drift upwards
          enable: true,
          outModes: {
            default: 'out', // Particles disappear when they leave the canvas
          },
          random: true, // Random movement
          speed: 0.5, // Slow movement
          straight: false, // Curved paths
        },
        number: {
          density: {
            enable: true,
            area: 800,
          },
          value: 80, // Number of particles
        },
        opacity: {
          value: 0.3, // Semi-transparent
          random: true,
          anim: {
            enable: true,
            speed: 0.5,
            opacity_min: 0.1,
            sync: false,
          },
        },
        shape: {
          type: 'circle',
        },
        size: {
          value: { min: 1, max: 3 }, // Small particles
          random: true,
          anim: {
            enable: true,
            speed: 1,
            size_min: 0.5,
            sync: false,
          },
        },
        glow: {
          enable: true,
          color: '#00d1ff',
          intensity: 0.5,
        },
      },
      detectRetina: true,
      zIndex: {
        value: -1, // Behind all content
      },
    }),
    [],
  );

  if (init) {
    return (
      <div className={`fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] ${className}`}>
        <Particles
          id="tsparticles"
          particlesLoaded={particlesLoaded}
          options={options as RecursivePartial<IOptions>}
        />
      </div>
    );
  }

  return <></>;
}
