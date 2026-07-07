import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#461599",
        "primary-container": "#5e35b1",
        "on-primary": "#ffffff",
        "on-primary-fixed": "#24005b",
        "on-primary-fixed-variant": "#5429a7",
        "primary-fixed": "#eaddff",
        "primary-fixed-dim": "#d1bcff",
        "inverse-primary": "#d1bcff",
        secondary: "#5f5e5e",
        "secondary-container": "#e2dfde",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#636262",
        "on-secondary-fixed": "#1c1b1b",
        "on-secondary-fixed-variant": "#474746",
        "secondary-fixed": "#e5e2e1",
        "secondary-fixed-dim": "#c8c6c5",
        tertiary: "#5a2f00",
        "tertiary-container": "#7b4200",
        "tertiary-fixed": "#ffdcc2",
        "tertiary-fixed-dim": "#ffb77a",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#ffb371",
        "on-tertiary-fixed": "#2e1500",
        "on-tertiary-fixed-variant": "#6d3a00",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        background: "#f9f9fb",
        "on-background": "#1a1c1d",
        surface: "#f9f9fb",
        "surface-dim": "#d9dadc",
        "surface-bright": "#f9f9fb",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f3f5",
        "surface-container": "#eeeef0",
        "surface-container-high": "#e8e8ea",
        "surface-container-highest": "#e2e2e4",
        "surface-variant": "#e2e2e4",
        "on-surface": "#1a1c1d",
        "on-surface-variant": "#494453",
        "inverse-surface": "#2f3132",
        "inverse-on-surface": "#f0f0f2",
        outline: "#7b7484",
        "outline-variant": "#cbc3d5",
        "surface-tint": "#6c45c0",
      },
      spacing: {
        xs: "4px",
        sm: "12px",
        base: "8px",
        md: "24px",
        lg: "40px",
        xl: "64px",
        gutter: "24px",
        "container-max": "1280px",
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem",
      },
      fontFamily: {
        "display-lg": ["Inter"],
        "display-lg-mobile": ["Inter"],
        "headline-md": ["Inter"],
        "headline-sm": ["Inter"],
        "body-lg": ["Inter"],
        "body-md": ["Inter"],
        "label-sm": ["Inter"],
        "label-md": ["Inter"],
      },
      fontSize: {
        "display-lg": [
          "48px",
          {
            lineHeight: "56px",
            letterSpacing: "-0.02em",
            fontWeight: "700",
          },
        ],
        "display-lg-mobile": [
          "32px",
          {
            lineHeight: "40px",
            letterSpacing: "-0.01em",
            fontWeight: "700",
          },
        ],
        "headline-md": [
          "24px",
          {
            lineHeight: "32px",
            letterSpacing: "-0.01em",
            fontWeight: "600",
          },
        ],
        "headline-sm": [
          "20px",
          {
            lineHeight: "28px",
            fontWeight: "600",
          },
        ],
        "body-lg": [
          "18px",
          {
            lineHeight: "28px",
            fontWeight: "400",
          },
        ],
        "body-md": [
          "16px",
          {
            lineHeight: "24px",
            fontWeight: "400",
          },
        ],
        "label-sm": [
          "12px",
          {
            lineHeight: "16px",
            fontWeight: "600",
          },
        ],
        "label-md": [
          "14px",
          {
            lineHeight: "20px",
            letterSpacing: "0.01em",
            fontWeight: "500",
          },
        ],
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
