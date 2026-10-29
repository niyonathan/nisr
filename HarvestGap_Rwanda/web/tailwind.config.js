/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Colours sampled from the NISR website
        nisr: { blue: "#0a5ca8", navy: "#123b7a", sky: "#4aa8e0", mist: "#eef3f9", line: "#d9e3ef", ink: "#1b2a3d", muted: "#5d6f84" },
      },
      fontFamily: {
        display: ["Lexend", '"Segoe UI"', "system-ui", "sans-serif"],
        sans: ['"Source Sans 3"', '"Segoe UI"', "system-ui", "sans-serif"],
      },
      boxShadow: { card: "0 6px 22px rgba(18, 59, 122, 0.07)" },
      // Light weight scale: text 400, labels/titles/buttons 500, key numbers 600.
      fontWeight: { semibold: "500", bold: "500" },
    },
  },
  plugins: [],
};
