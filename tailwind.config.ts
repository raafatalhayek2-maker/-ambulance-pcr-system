import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff5ff',
          100: '#dbe7ff',
          500: '#0B5FFF',
          600: '#084ad6',
          700: '#063aa8',
        },
        ok:    { 500: '#16a34a', 100: '#dcfce7' },
        warn:  { 500: '#d97706', 100: '#fef3c7' },
        err:   { 500: '#dc2626', 100: '#fee2e2' },
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out',
        'slide-up': 'slideUp 250ms ease-out',
        'pulse-rec': 'pulseRec 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:  { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pulseRec: { '0%,100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(1.15)', opacity: '0.7' } },
      },
    },
  },
  plugins: [],
};
export default config;
