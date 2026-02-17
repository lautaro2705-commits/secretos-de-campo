import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf8f0",
          100: "#f9eddc",
          200: "#f2d7b4",
          300: "#e9ba82",
          400: "#df964e",
          500: "#d77a2d",
          600: "#c86323",
          700: "#a64c1f",
          800: "#853d20",
          900: "#6c341d",
          950: "#3a190e",
        },
      },
    },
  },
  plugins: [],
};
export default config;
