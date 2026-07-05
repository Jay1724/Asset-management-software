/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "tenant-primary": "var(--tenant-primary-color)",
        "tenant-secondary": "var(--tenant-secondary-color)",
      },
      fontFamily: {
        tenant: "var(--tenant-font-family)",
      },
    },
  },
  plugins: [],
};
