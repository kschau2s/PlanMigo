/** @type {import('tailwindcss').Config} */
// PlanMigo Tailwind-Theme.
// Alle Werte zeigen auf die CSS-Variablen aus src/styles/tokens.css.
// Nie Hex-Werte hier eintragen — nur Tokens referenzieren.

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pm: {
          terracotta:  "var(--pm-terracotta)",
          orange:      "var(--pm-orange)",
          orangeDeep:  "var(--pm-orange-deep)",
          sage:        "var(--pm-sage)",
          greenDark:   "var(--pm-green-dark)",
          sand:        "var(--pm-sand)",
          sandLight:   "var(--pm-sand-light)",
          cream:       "var(--pm-cream)",
          creamWarm:   "var(--pm-cream-warm)",
          paper:       "var(--pm-paper)",
          espresso:    "var(--pm-espresso)",
          taupe:       "var(--pm-taupe)",
          white:       "var(--pm-white)",
        },
        surface: {
          page:       "var(--surface-page)",
          card:       "var(--surface-card)",
          inverse:    "var(--surface-inverse)",
          chip:       "var(--surface-chip)",
          chipActive: "var(--surface-chip-active)",
        },
        content: {
          heading:        "var(--text-heading)",
          body:           "var(--text-body)",
          muted:          "var(--text-muted)",
          onInverse:      "var(--text-on-inverse)",
          onInverseMuted: "var(--text-on-inverse-muted)",
          eyebrow:        "var(--text-eyebrow)",
        },
        accent: {
          primary:   "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
        },
      },

      borderColor: {
        card:     "var(--border-card)",
        hairline: "var(--border-hairline)",
      },

      fontFamily: {
        serif: ["Georgia", '"Times New Roman"', "serif"],
        sans:  ["Helvetica", '"Helvetica Neue"', "Arial", "sans-serif"],
        mono:  ["ui-monospace", '"SF Mono"', "Menlo", "monospace"],
      },

      fontSize: {
        display:   "var(--text-display-web)",
        h1:        "var(--text-h1-web)",
        h2:        "var(--text-h2-web)",
        cardTitle: "var(--text-card-title-web)",
        body:      "var(--text-body-web)",
        caption:   "var(--text-caption-web)",
        eyebrow:   "var(--text-eyebrow-web)",
      },

      letterSpacing: {
        eyebrow:  "var(--tracking-eyebrow)",
        label:    "var(--tracking-label)",
        headline: "var(--tracking-headline)",
        display:  "var(--tracking-display)",
      },

      borderRadius: {
        card:   "var(--radius-card)",
        chip:   "var(--radius-chip)",
        button: "var(--radius-button)",
        image:  "var(--radius-image)",
      },

      boxShadow: {
        card: "var(--shadow-card)",
        soft: "var(--shadow-soft)",
      },

      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        7: "var(--space-7)",
        8: "var(--space-8)",
        card: "var(--card-pad)",
      },

      transitionTimingFunction: { brand: "var(--ease-brand)" },
      transitionDuration: {
        quick: "var(--duration-quick)",
        base:  "var(--duration-base)",
      },
    },
  },
  plugins: [],
};
