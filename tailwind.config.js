/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        romantic: ['"Great Vibes"', 'cursive'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        cinematic: {
          bg: '#0a0612',
          bg2: '#140a1f',
          warm: '#2d1b3d',
          glow: '#ff8a8a',
          love: '#ff6b9d',
          gold: '#f7c97e',
          soft: '#e8d5f2',
        }
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 10s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'heart-beat': 'heartBeat 1.2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'fade-in-up': 'fadeInUp 1s ease-out forwards',
        'zoom-slow': 'zoomSlow 8s ease-in-out infinite alternate',
        'sparkle': 'sparkle 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-12px) rotate(2deg)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        heartBeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.15)' },
          '50%': { transform: 'scale(0.98)' },
          '75%': { transform: 'scale(1.08)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        zoomSlow: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.08)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
