/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#e84b6a',
          dark: '#c93a58',
          light: '#fff0f3',
          mid: '#ffd6de',
          300: '#ff8fa3',
        },
      },
      borderRadius: {
        '2xl': '14px',
        'xl': '10px',
      },
    },
  },
  plugins: [],
}
