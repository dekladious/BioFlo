const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        card: "0 0 40px rgba(15,23,42,0.8)",
        "card-hover": "0 0 55px rgba(15,23,42,0.95)",
        inset: "inset 0 1px 1px rgba(255,255,255,0.05)",
      },
      colors: {
        app: "var(--bg-app)",
        surface: "var(--bg-surface)",
        "surface-alt": "var(--bg-surface-alt)",
        elevated: "var(--bg-elevated)",
        border: {
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        text: {
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
          soft: "var(--text-soft)",
        },
        accent: {
          primary: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          success: "var(--accent-success)",
          warning: "var(--accent-warning)",
          danger: "var(--accent-danger)",
          cyan: "#5defFB",
          purple: "#b195ff",
          green: "#63f5c0",
        },
      },
      borderRadius: {
        "2xl": "1.5rem",
        "3xl": "2rem",
        card: "1.5rem",
      },
      backgroundImage: {
        hero: "var(--bg-hero)",
        "metric-pill": "var(--bg-metric-pill)",
      },
      keyframes: {
        float: {
          "0%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -6px, 0)" },
          "100%": { transform: "translate3d(0, 0, 0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        float: "float 12s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
      transitionTimingFunction: {
        "expo-out": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
