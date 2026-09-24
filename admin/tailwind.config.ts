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
        sidebar: {
          bg: "#1B2537",
          hover: "#243045",
          active: "#2D3D56",
          border: "#2A3A52",
          text: "#8FA3BF",
          label: "#4A6080",
        },
      },
    },
  },
  plugins: [],
};

export default config;
