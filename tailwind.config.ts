import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Golden Winter — DESIGN_SYSTEM.md mục 37 (raw tokens)
        brand: {
          pine: '#0A5C36', // primary
          pineHover: '#0D7344', // primary hover
          pineLight: '#E8F5E9', // primary light
          gold: '#EEB902', // champagne gold (accent)
          goldLight: '#FEF9C3',
          warm: '#F4A261', // warm gold (pending/shortage)
        },
        gw: {
          canvas: '#F8F9FA',
          card: '#FFFFFF',
          ink: '#2B2D42',
          muted: '#6C757D',
          light: '#ADB5BD',
          hair: '#E9ECEF',
          tableHead: '#F1F5F2',
          hover: '#F8F9FA',
        },
        // Status colors — DESIGN_SYSTEM.md mục 12
        status: {
          successBg: '#E8F5E9',
          successText: '#0A5C36',
          pendingBg: '#FEF3C7',
          pendingText: '#B45309',
          revisionBg: '#FFEEDD',
          revisionText: '#D97706',
          dangerBg: '#FEE2E2',
          dangerText: '#991B1B',
          neutralBg: '#F1F3F5',
          neutralText: '#495057',
        },
        card: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        card: '12px',
        lg: '16px',
      },
      boxShadow: {
        card: '0 4px 16px rgba(10, 92, 54, 0.04)',
        hover: '0 8px 24px rgba(10, 92, 54, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config

