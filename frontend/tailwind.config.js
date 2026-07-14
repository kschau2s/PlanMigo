/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pm: {
          orange: "#C9603A",
          sage: "#7B9D6F",
          greenDark: "#5C7A52",
          sand: "#D8C9A8",
          cream: "#FAF6F1",
        },
      },
    },
  },
  plugins: [],
};
