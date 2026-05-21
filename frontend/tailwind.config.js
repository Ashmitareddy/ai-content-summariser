/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A8A', // Professional blue
        secondary: '#4C1D95', // Deep elegant purple
        accent: '#3B82F6', // Lighter blue
        background: '#F8FAFC', // Crisp white/slate
        surface: '#FFFFFF',
      },
      animation: {
        'flip': 'flip 0.6s ease-in-out',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
