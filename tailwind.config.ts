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
        background: '#303036',
        foreground: '#FEFFFE',
        'accent-red': '#F2542D',
        'accent-green': '#669D31',
        'accent-blue': '#2081C3',
        white: '#FEFFFE',
        black: '#303036',
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        logo: ["Bungee", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config; 