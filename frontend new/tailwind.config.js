/** @type {import('tailwindcss').Config} */
// Colour tokens follow the campus design (f2): ink / deck / line, cyan primary
// accent, amber for the one main action, and one hue per agent area.
// Token names are unchanged so every page keeps working.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        hud: {
          bg0: "#050a12",
          bg1: "#0a1524",
          deck2: "#0f1f34",
          panel: "rgba(10,21,36,.82)",
          edge: "#26405f",
          cyan: "#59d4ff",
          cyandim: "#2b7ea0",
          blue: "#b48cff",
          violet: "#b48cff",
          lime: "#7ee787",
          gold: "#ffd166",
          pink: "#ff8fab",
          amber: "#ffb03b",
          red: "#ff6b5e",
          green: "#4be3a0",
          text: "#dbe7f5",
          dim: "#8aa0ba",
          faint: "#6a819b",
        },
      },
      fontFamily: {
        sans: ["Barlow", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        display: ['"Barlow Condensed"', "Barlow", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
