import type { Config } from "tailwindcss";
import tokens from "./design-tokens.json";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        "paper-raised": "var(--paper-raised)",
        "paper-inset": "var(--paper-inset)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "ink-faint": "var(--ink-faint)",
        rule: "var(--rule)",
        "rule-strong": "var(--rule-strong)",
        accent: "var(--accent)",
        focus: "var(--focus)",
        "uncertain-fg": "var(--uncertain-fg)",
        "uncertain-bg": "var(--uncertain-bg)",
        "uncertain-rule": "var(--uncertain-rule)",
        "paused-hatch": "var(--paused-hatch)",
        speech: "var(--speech)",
        detection: "var(--detection)",
        danger: "var(--danger)",
      },
      fontFamily: {
        serif: ["var(--font-serif)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        xs: ["0.8125rem", { lineHeight: String(tokens.line_height.mono) }],
        sm: ["0.9375rem", { lineHeight: String(tokens.line_height.body) }],
        base: ["1.0625rem", { lineHeight: String(tokens.line_height.body) }],
        lg: ["1.25rem", { lineHeight: String(tokens.line_height.body) }],
        xl: ["1.625rem", { lineHeight: String(tokens.line_height.tight) }],
        "2xl": ["2.25rem", { lineHeight: String(tokens.line_height.tight) }],
        display: ["3.5rem", { lineHeight: String(tokens.line_height.tight) }],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        md: "4px",
      },
      maxWidth: {
        page: "1440px",
        measure: "68ch",
      },
      transitionDuration: {
        fast: "160ms",
        base: "220ms",
      },
      transitionTimingFunction: {
        museum: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
