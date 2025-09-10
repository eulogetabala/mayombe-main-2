/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
   
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
    colors: {
      'primary': '#EB9A07',
      'secondary': '#51A905',
      'pink': '#ff49db',
      'orange': '#ff7849',
      'green': '#13ce66',
      'yellow': '#ffc82c',
      'gray-dark': '#273444',
      'gray': '#8492a6',
      'gray-light': '#d3dce6',
      'white': '#ffffff',
      'black': '#000000',
    }
  },
  plugins: [],
};
