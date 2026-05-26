/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0c0c12',
          raised: '#12121a',
          overlay: '#1a1a26',
          border: '#2a2a3a',
        },
        accent: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          muted: '#4f46e5',
        },
        glow: {
          violet: 'rgba(99, 102, 241, 0.15)',
          blue: 'rgba(59, 130, 246, 0.1)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)',
        glow: '0 0 40px rgba(99, 102, 241, 0.12)',
      },
    },
  },
  plugins: [],
};
