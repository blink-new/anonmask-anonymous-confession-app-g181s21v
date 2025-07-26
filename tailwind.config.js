/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#8B5CF6",
        accent: "#F59E0B",
        background: "#0F0F23",
        card: "#1A1A2E",
        text: {
          primary: "#FFFFFF",
          secondary: "#A1A1AA",
        },
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        "inter-medium": ["Inter-Medium", "sans-serif"],
      },
    },
  },
  plugins: [],
}