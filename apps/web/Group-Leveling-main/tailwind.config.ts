import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-charcoal': '#121214',
        'digital-lavender': '#A78BFA',
        'neon-cyan': '#00E8FF',
        // Asset Forge Colors
        'background': '#050912',
        'surface': '#0F172A',
        'primary': '#8B5CF6',
        'primaryDark': '#7C3AED',
        'system': '#38BDF8',
        'systemGlow': '#0EA5E9',
        'border': '#1E293B',
      },
      fontFamily: {
        exo: ['var(--font-exo2)', 'sans-serif'],
        'header': ['var(--font-orbitron)', 'Orbitron', 'sans-serif'],
        'ui': ['var(--font-rajdhani)', 'Rajdhani', 'sans-serif'],
      },
      boxShadow: {
        'aura': '0 0 15px -3px rgba(167, 139, 250, 0.3), 0 0 10px -2px rgba(0, 232, 255, 0.2)', // Lavender + Cyan glow
      },
      // Safe area utilities
      padding: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      margin: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      animation: {
        'pulsate': 'pulsate 2.5s infinite',
        'pulse-fade-in-out': 'pulse-fade-in-out 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulsate: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 232, 255, 0.4)' },
          '50%': { boxShadow: '0 0 0 4px rgba(0, 232, 255, 0)' },
        },
        'pulse-fade-in-out': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
