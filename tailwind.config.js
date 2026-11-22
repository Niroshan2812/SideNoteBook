/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./popup.html",
    "./sidepanel.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sticky: {
          yellow: '#FDF7A4',
          yellowHeader: '#F8EE72',
          blue: '#CBE9F6',
          blueHeader: '#A5D8F0',
          green: '#CCF1C5',
          greenHeader: '#A7E49C',
          pink: '#F6CFE6',
          pinkHeader: '#EEAED4',
          purple: '#DCD0F8',
          purpleHeader: '#C3AEF2',
          dark: '#1E222A',
          darkHeader: '#15181E'
        }
      }
    },
  },
  plugins: [],
}
