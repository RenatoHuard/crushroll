/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        crush: {
          bg:     '#1E2327',
          card:   '#262B31',
          card2:  '#2D1B22',
          card3:  '#2D2400',
          border: '#3A3F45',
          pink:   '#E1306C',
          gold:   '#FFD700',
          muted:  '#A0A0A0',
          green:  '#16a34a',
          indigo: '#2D2D5E',
          'indigo-border': '#5B5BD6',
          'indigo-text':   '#A5B4FC',
        },
      },
    },
  },
  plugins: [],
}
