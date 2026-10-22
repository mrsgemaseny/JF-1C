/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'brand-green': '#00562D',
        'brand-beige': '#F5F5DC',
        'brand-accent': '#4a7c59',
        canvas: '#F9FAFB',
        surface: '#FFFFFF',
        'surface-elevated': '#FFFFFF',
        border: '#E5E7EB',
        brand: {
          DEFAULT: '#00562D',
          dark: '#004222',
          muted: 'rgba(0, 86, 45, 0.1)',
        },
      },
    },
  },
  plugins: [],
};
