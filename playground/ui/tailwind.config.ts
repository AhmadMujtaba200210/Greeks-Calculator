import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--pg-border))",
        input: "hsl(var(--pg-border))",
        ring: "hsl(var(--pg-ring))",
        background: "hsl(var(--pg-background))",
        foreground: "hsl(var(--pg-foreground))",
        primary: {
          DEFAULT: "hsl(var(--pg-primary))",
          foreground: "hsl(var(--pg-primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--pg-secondary))",
          foreground: "hsl(var(--pg-secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--pg-muted))",
          foreground: "hsl(var(--pg-muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--pg-accent))",
          foreground: "hsl(var(--pg-accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--pg-destructive))",
          foreground: "hsl(var(--pg-destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--pg-card))",
          foreground: "hsl(var(--pg-card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--pg-radius)",
        md: "calc(var(--pg-radius) - 2px)",
        sm: "calc(var(--pg-radius) - 4px)",
      },
      boxShadow: {
        panel: "0 18px 48px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      keyframes: {
        "fade-slide-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-slide-in": "fade-slide-in 220ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
