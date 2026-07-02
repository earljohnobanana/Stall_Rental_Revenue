/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"Courier Prime"', 'Courier', 'monospace'],
        sans: ['"Source Sans 3"', 'sans-serif'],
      },
      colors: {
        gov: {
          navy: '#1a2744',
          blue: '#2c4a8c',
          gold: '#c9a84c',
          cream: '#f5f0e8',
          paper: '#faf8f3',
          ink: '#1c1c2e',
          red: '#8b1a1a',
          green: '#1a5c2a',
          gray: '#6b7280',
          border: '#c8b99a',
        }
      },
      backgroundImage: {
        'paper-texture': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23faf8f3'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%23f0ece0' opacity='0.3'/%3E%3C/svg%3E\")",
      }
    },
  },
  plugins: [],
}
