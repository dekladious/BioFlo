/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.25)",
      },
      colors: {
        brand: {
          bg: "#0b1117",
          cyan: "#60a5fa",
          teal: "#14b8a6",
          emerald: "#10b981",
        },
      },
    },
  },
  plugins: [],
};
