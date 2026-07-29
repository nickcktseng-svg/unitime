import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        paper: "#f7f4ed",
        mint: "#42b883",
        coral: "#f26b5e",
        sun: "#f2b84b"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 32, 38, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
