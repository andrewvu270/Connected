/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
      },
      boxShadow: {
        soft: "0 14px 40px rgba(15, 23, 42, 0.08)",
        clay: "0 18px 55px rgba(15, 23, 42, 0.10)",
      },
      borderRadius: {
        xl: "14px",
        '2xl': "18px",
      },
    },
  },
  plugins: [],
};
