import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        // Alias perlog-* → tokens Conecta — qualquer página legada que ainda
        // usar `text-perlog-navy`, `bg-perlog-orange`, etc. passa a renderizar
        // automaticamente na paleta Conecta+ G&G sem precisar tocar a marcação.
        perlog: {
          orange: '#E8621A',
          accent: '#FF8C42',
          orangeDark: '#D8591A',
          navy: '#0D2B6B',
          navyDark: '#071840',
          navyLight: '#1A3F8F',
          slate: '#6B7280',
          mute: '#94A3B8',
          bg: '#F4F6FB',
          surface: '#FFFFFF',
        },
        conecta: {
          primary: '#0D2B6B',
          mid: '#1A3F8F',
          dark: '#071840',
          accent: '#E8621A',
          accentLight: '#FF8C42',
          light: '#F4F6FB',
          text: '#1E1E2E',
          muted: '#6B7280',
        },
        border: 'hsl(214 32% 91%)',
        input: 'hsl(214 32% 91%)',
        ring: '#E8621A',
        background: '#F4F6FB',
        foreground: '#1E1E2E',
        primary: { DEFAULT: '#E8621A', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#0D2B6B', foreground: '#FFFFFF' },
        muted: { DEFAULT: 'hsl(210 40% 96%)', foreground: '#475569' },
        accent: { DEFAULT: 'hsl(210 40% 96%)', foreground: '#0F172A' },
        destructive: { DEFAULT: '#DC2626', foreground: '#FFFFFF' },
        card: { DEFAULT: '#FFFFFF', foreground: '#0F172A' },
        popover: { DEFAULT: '#FFFFFF', foreground: '#0F172A' },
      },
      borderRadius: { lg: '0.75rem', md: '0.5rem', sm: '0.375rem' },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-poppins)', 'Poppins', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'conecta-deep': 'linear-gradient(135deg, #0D2B6B 0%, #1A3F8F 50%, #071840 100%)',
        'conecta-accent': 'linear-gradient(135deg, #E8621A 0%, #FF8C42 100%)',
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)',
        elev: '0 4px 14px -2px rgb(15 23 42 / 0.08), 0 2px 6px -1px rgb(15 23 42 / 0.06)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(232, 98, 26, 0.45)' },
          '50%': { boxShadow: '0 0 0 18px rgba(232, 98, 26, 0)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-12px) translateX(8px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'gradient-shift': 'gradient-shift 12s ease infinite',
        'pulse-glow': 'pulse-glow 2.2s ease-in-out infinite',
        'float-slow': 'float-slow 8s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};
export default config;
