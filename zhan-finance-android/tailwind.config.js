/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#0a0a0c',
        surface: '#18181b',
        'surface-elevated': '#202024',
        border: 'rgba(255, 255, 255, 0.08)',
        brand: {
          DEFAULT: '#10b981',
          dark: '#059669',
          muted: 'rgba(16, 185, 129, 0.14)',
        },
      },
    },
  },
  plugins: [],
};
