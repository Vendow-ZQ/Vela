/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'shokz': {
          orange: '#E85A2B',
          'orange-light': '#F26522',
          'orange-soft': '#F08060',
          'orange-pale': '#FDF6F3',
          'orange-bg': '#FFF8F5',
          black: '#000000',
          'black-900': '#0D0D0D',
          'black-800': '#1A1A1A',
          'black-700': '#262626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
