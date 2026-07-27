/** @type {import('tailwindcss').Config} */
// Nocturne — the design system the app is skinned in. A quiet dark blue-grey
// ground, Inter at 500 for headings, 8px radii, and one blurple accent used as a
// line, a border and a glow. Status is carried by tonal weight on this one hue,
// never by adding a second one — which is why there is no emerald/amber/sky here
// and none should come back.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#161826', // page ground
        surface: '#232532', // card ground
        ink: '#e9e9ed', // body text
        accent: {
          DEFAULT: '#9184d9',
          100: '#f5f4ff',
          200: '#e7e5fe',
          300: '#d2cefd',
          400: '#b5abfc',
          500: '#968ae0',
          600: '#796cbf',
          700: '#5d5294',
          800: '#423a6a',
          900: '#2b2741',
        },
        neutral: {
          100: '#f3f5fe',
          200: '#e4e7f5',
          300: '#cfd3e5',
          400: '#b2b6ca',
          500: '#9397ab',
          600: '#75798c',
          700: '#595d6c',
          800: '#3f424d',
          900: '#292b31',
        },
        // The one non-accent hue in the system: the pain / form-breakdown marker.
        // Deliberately without a family — it exists so a set that ended badly is
        // visible on a chart and beside a row, and nowhere else.
        warn: '#f6a06b',
      },
      borderRadius: { sm: '4px', DEFAULT: '8px', md: '8px', lg: '14px' },
      // "Inter Variable" is the family name @fontsource-variable ships; plain
      // "Inter" is there for a machine that happens to have it installed.
      fontFamily: { sans: ['Inter Variable', 'Inter', 'system-ui', '-apple-system', 'sans-serif'] },
      boxShadow: {
        edge: '0 0 0 1px #3f424d',
        'edge-md': '0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,0.55)',
        'edge-lg': '0 0 0 1px #9397ab, 0 16px 40px rgba(0,0,0,0.65)',
      },
      keyframes: {
        // The "up next" dot. The only animation on Home.
        pulse: { '0%,100%': { opacity: '0.55' }, '50%': { opacity: '1' } },
      },
      animation: { pulse: 'pulse 2.4s ease-in-out infinite' },
    },
  },
  plugins: [],
};
