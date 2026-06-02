import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        perlog: {
          orange: '#F37021',
          accent: '#FF8A3D',
          orangeDark: '#D8591A',
          navy: '#1E2A4A',
          navyDark: '#141C33',
          navyLight: '#2A3B66',
          slate: '#475569',
          mute: '#94A3B8',
          bg: '#F8FAFC',
          surface: '#FFFFFF',
        },
        border: 'hsl(214 32% 91%)',
        input: 'hsl(214 32% 91%)',
        ring: '#F37021',
        background: '#F8FAFC',
        foreground: '#0F172A',
        primary: { DEFAULT: '#F37021', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#1E2A4A', foreground: '#FFFFFF' },
        muted: { DEFAULT: 'hsl(210 40% 96%)', foreground: '#475569' },
        accent: { DEFAULT: 'hsl(210 40% 96%)', foreground: '#0F172A' },
        destructive: { DEFAULT: '#DC2626', foreground: '#FFFFFF' },
        card: { DEFAULT: '#FFFFFF', foreground: '#0F172A' },
        popover: { DEFAULT: '#FFFFFF', foreground: '#0F172A' },
      },
      borderRadius: { lg: '0.75rem', md: '0.5rem', sm: '0.375rem' },
      fontFamily: { sans: ['var(--font-inter)', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)',
        elev: '0 4px 14px -2px rgb(15 23 42 / 0.08), 0 2px 6px -1px rgb(15 23 42 / 0.06)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
};
export default config;
