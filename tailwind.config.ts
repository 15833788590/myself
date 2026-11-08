import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#f0f7f4", 100: "#d9ece3", 500: "#2f855a", 600: "#276749", 700: "#22543d" },
      },
    },
  },
  plugins: [],
};
export default config;
