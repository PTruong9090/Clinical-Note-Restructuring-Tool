export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ahmc: {
          navy: "#12355B",
          blue: "#1F6FA9",
          teal: "#178C8C",
          green: "#3BAA75",
          amber: "#D9822B",
          mist: "#F3F7FA"
        }
      },
      boxShadow: {
        panel: "0 10px 30px rgba(18, 53, 91, 0.08)"
      }
    }
  },
  plugins: []
};
