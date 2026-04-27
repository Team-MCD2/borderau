/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Couleurs personnalisées pour le dashboard
        shopify: {
          green: '#96bf48',
          dark: '#1a1a2e',
          light: '#f6f6f7',
        },
      },
    },
  },
  plugins: [],
};
