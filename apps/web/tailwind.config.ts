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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Fasal Slot civic design system — see stitch_prd_screen_builder/agricivic_operational_system/DESIGN.md
        canopy: {
          DEFAULT: "#1B4D3E", // primary
          dark: "#0D2820", // token shadow / pressed
          deep: "#003629",
        },
        amber: {
          DEFAULT: "#D97706", // secondary / arrived
        },
        ochre: {
          DEFAULT: "#B45309", // tertiary / token accents
        },
        slate: {
          ink: "#1E293B",
        },
        chalk: {
          DEFAULT: "#F8FAFC",
          white: "#FFFFFF",
        },
        stage: {
          booked: { bg: "#E0F2FE", text: "#0369A1" },
          arrived: { bg: "#FEF3C7", text: "#B45309" },
          weighed: { bg: "#EEF2FF", text: "#4338CA" },
          accepted: { bg: "#DCFCE7", text: "#15803D" },
          paid: { bg: "#D1FAE5", text: "#047857" },
          rejected: { bg: "#FEE2E2", text: "#991B1B" },
        },
      },
      fontFamily: {
        sans: ["var(--font-public-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-noto-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        token: "0 4px 0 0 #0D2820",
        "token-sm": "0 3px 0 0 #0D2820",
      },
    },
  },
  plugins: [],
};
export default config;
