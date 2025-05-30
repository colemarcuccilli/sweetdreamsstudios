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
        background: '#FFFDF5',
        foreground: '#303036',
        'accent-blue': '#2081C3',
        'accent-yellow': '#fff380',
        'accent-green': '#5baf6f',
        'accent-pink': '#EC4899',
        'accent-red': '#F2542D',
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