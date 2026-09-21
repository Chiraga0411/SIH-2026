/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        hud: {
          bg0: "#040810",
          bg1: "#081326",
          panel: "rgba(8,20,38,.58)",
          edge: "rgba(63,214,255,.28)",
          cyan: "#45D8FF",
          cyandim: "#1E6E8C",
          blue: "#3E7BEF",
          amber: "#FF9A4D",
          red: "#FF5C5C",
          green: "#4FE2A8",
          text: "#DCEFFB",
          dim: "#7592A8",
          faint: "#465A6C",
        },
      },
      fontFamily: {
        display: ['"Rajdhani"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
