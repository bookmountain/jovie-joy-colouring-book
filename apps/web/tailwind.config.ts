import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/data/**/*.{ts,tsx}",
    "./src/state/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cocoa: {
          ink: "#322f37",
          text: "#3c3c3c",
          bean: "#3e2913",
          border: "#564430",
          line: "#e6e6e6",
          cream: "#fffaf7",
          blush: "#ffe4de",
          lavender: "#e7d8f6",
          purple: "#816bc1",
          coral: "#e9514b",
          honey: "#ffbb49",
          mint: "#cfe9c6",
          sky: "#bfe6f6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Arial", "Helvetica", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        cute: ["var(--font-cute)", "var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        disclosure: "0 1px 4px rgb(0 0 0 / 15%)",
        drawer: "0 24px 80px rgba(50, 47, 55, 0.18)",
        soft: "0 16px 40px rgba(62, 41, 19, 0.08)",
      },
      borderRadius: {
        coco: "22px",
        "coco-sm": "16px",
      },
    },
  },
  plugins: [],
};

export default config;
