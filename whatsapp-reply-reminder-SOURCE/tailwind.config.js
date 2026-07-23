/** @type {import('tailwindcss').Config} */
export default {
  content: ['./popup.html', './options.html', './src/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          green: '#25D366',
          dark: '#128C7E',
          teal: '#075E54',
          bg: '#ECE5DD',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
