/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "dofus-green": "#4ade80",
        "dofus-dark": "#0f1f14",
        "glass-bg": "rgba(15,31,20,0.72)",
        "glass-border": "rgba(255,255,255,0.09)",
      },
    },
  },
  plugins: [],
};
