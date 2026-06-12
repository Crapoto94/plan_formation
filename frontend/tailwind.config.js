/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivry: {
          navy: '#29345C',
          'navy-light': '#3A4A7A',
          'navy-dark': '#1E2845',
          red: '#EC4B52',
          'red-dark': '#D43840',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
