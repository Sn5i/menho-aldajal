/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // <-- This line is the most important!
  ],
  theme: {
    extend: {
      colors: {
        'saudi-primary': '#1A4D2E',
        'saudi-accent': '#D4A373',
        'saudi-bg': '#FAEDCE',
        'saudi-card': '#FEFAE0',
        'saudi-text': '#333333',
        'saudi-danger': '#E63946',
      },
      fontFamily: {
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
      }
    },
  },
  plugins: [],
}