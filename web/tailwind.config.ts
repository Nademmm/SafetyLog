import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        /* shadcn/ui semantic variables */
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        /* Industrial Dark Foundation */
        carbon: '#111418',
        graphite: '#1C2229',
        elevated: '#252D36',
        'off-white': '#F4F5F6',
        'steel-muted': '#A3AAB3',
        'charcoal-border': '#343D47',

        /* Surface Semantic Tokens */
        surface: {
          base: 'var(--surface-base)',
          default: 'var(--surface-default)',
          elevated: 'var(--surface-elevated)',
          overlay: 'var(--surface-overlay)',
        },

        /* Text Semantic Tokens */
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },

        /* Industrial Orange Accent */
        industrial: {
          orange: '#F97316',
          'orange-hover': '#EA580C',
          'orange-subtle': 'rgba(249, 115, 22, 0.15)',
        },

        /* K3 Semantic Colors (ISO 7010 / ANSI Z535 compliant) */
        safety: {
          danger: {
            DEFAULT: 'var(--safety-danger)',
            foreground: 'var(--safety-danger-foreground)',
            bg: 'var(--safety-danger-bg)',
            border: 'var(--safety-danger-border)',
            hover: '#DC2626',
          },
          warning: {
            DEFAULT: 'var(--safety-warning)',
            foreground: 'var(--safety-warning-foreground)',
            bg: 'var(--safety-warning-bg)',
            border: 'var(--safety-warning-border)',
            hover: '#EA580C',
          },
          caution: {
            DEFAULT: 'var(--safety-caution)',
            foreground: 'var(--safety-caution-foreground)',
            bg: 'var(--safety-caution-bg)',
            border: 'var(--safety-caution-border)',
            hover: '#EAB308',
          },
          info: {
            DEFAULT: 'var(--safety-info)',
            foreground: 'var(--safety-info-foreground)',
            bg: 'var(--safety-info-bg)',
            border: 'var(--safety-info-border)',
            hover: '#2563EB',
          },
          safe: {
            DEFAULT: 'var(--safety-safe)',
            foreground: 'var(--safety-safe-foreground)',
            bg: 'var(--safety-safe-bg)',
            border: 'var(--safety-safe-border)',
            hover: '#16A34A',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        /* SafetyLog Typography Scale */
        display: ['40px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        h1: ['32px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        h2: ['24px', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
        h3: ['20px', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.01em' }],
        h4: ['16px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0' }],
        'body-lg': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        body: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        label: ['12px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.02em' }],
        caption: ['11px', { lineHeight: '1.3', fontWeight: '400' }],
        button: ['14px', { lineHeight: '1.4', fontWeight: '600' }],
      },
      borderRadius: {
        sm: 'var(--radius-sm, 6px)',
        DEFAULT: 'var(--radius-md, 8px)',
        md: 'var(--radius-md, 8px)',
        input: 'var(--radius-md, 8px)',
        button: 'var(--radius-md, 8px)',
        lg: 'var(--radius-lg, 12px)',
        card: 'var(--radius-lg, 12px)',
        xl: 'var(--radius-xl, 16px)',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        elevated: '0 4px 12px 0 rgba(0, 0, 0, 0.5)',
        dropdown: '0 8px 24px -4px rgba(0, 0, 0, 0.6)',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      screens: {
        xs: '360px',
      },
    },
  },
  plugins: [],
}

export default config
