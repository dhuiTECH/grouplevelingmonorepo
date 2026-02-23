/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'deep-charcoal': '#121214',
        'digital-lavender': '#A78BFA',
        'neon-cyan': '#00E8FF',
        'aura-indigo': 'rgba(30, 27, 75, 0.4)',
      },
      fontFamily: {
        exo: ['Exo2-Regular', 'sans-serif'],
        header: ['Orbitron-Bold', 'sans-serif'],
        ui: ['Rajdhani-Medium', 'sans-serif'],
      },
    },
  },
  plugins: [],
}