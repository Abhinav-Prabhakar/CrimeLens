/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0c0a09",
        foreground: "#d9d4cc",
        noir: {
          950: "#080605",
          900: "#0c0a09",
          850: "#100e0c",
          800: "#141110",
          750: "#1a1614",
          700: "#221d1a",
          600: "#2a2522",
          500: "#5d574f",
          400: "#8d867c",
          300: "#b5afa6",
          200: "#d9d4cc",
          100: "#f0ede8",
        },
        crimson: {
          DEFAULT: "#e13c32",
          dim: "#8c2620",
          bright: "#ff4d42",
        },
        amber: {
          accent: "#d9a520",
          dim: "#8a5a20",
        },
        cobalt: {
          DEFAULT: "#2f5f9e",
          dim: "#1e3d66",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "Courier New", "monospace"],
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        typewriter: ["Special Elite", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
