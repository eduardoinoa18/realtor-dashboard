/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#07090F',
        surface: '#111827',
        surface2: '#0D1117',
        surface3: '#161D2A',
        border: '#1E293B',
        border2: '#374151',
        gold: '#D4A043',
        gold2: '#92400E',
        'gold-dim': 'rgba(212, 160, 67, 0.12)',
        text: '#F1F5F9',
        sub: '#94A3B8',
        dim: '#64748B',
        muted: '#374151',
        green: '#10B981',
        red: '#EF4444',
        blue: '#3B82F6',
        amber: '#F59E0B',
        purple: '#8B5CF6',
        pink: '#EC4899',
        cyan: '#06B6D4',
        teal: '#14B8A6',
      },
      fontSize: {
        'nano': '0.52rem',
        'xs': '0.72rem',
        'sm': '0.83rem',
        'base': '0.95rem',
        'lg': '1.25rem',
        'xl': '1.65rem',
      },
    },
  },
  plugins: [],
};
