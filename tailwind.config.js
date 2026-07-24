/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0f172a',
          surface: '#1e293b',
          accent: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
