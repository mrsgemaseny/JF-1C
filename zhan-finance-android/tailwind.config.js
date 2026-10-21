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
        canvas: '#F5F5DC',
        surface: '#FFFFFF',
        'surface-elevated': '#FAFAFA',
        border: 'rgba(0, 86, 45, 0.1)',
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
