/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "dofus-green": "#4ade80",
        "dofus-dark": "#080e0a",
        "glass-bg": "rgba(8,16,10,0.64)",
        "glass-border": "rgba(255,255,255,0.09)",
      },
    },
  },
  plugins: [],
};
