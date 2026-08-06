/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        nl: {
          bg: 'var(--nl-bg)',
          panel: 'var(--nl-panel)',
          panelSoft: 'var(--nl-panel-soft)',
          border: 'var(--nl-border)',
          text: 'var(--nl-text)',
          muted: 'var(--nl-muted)',
          primary: 'var(--nl-primary)',
          primaryDark: 'var(--nl-primary-dark)',
          success: 'var(--nl-success)',
          warning: 'var(--nl-warning)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        'nl-card': '0 20px 44px rgba(0,0,0,.4)',
        'nl-glow': '0 0 36px rgba(124,58,237,.45)',
      },
      borderRadius: {
        xl2: '18px',
        xl3: '22px',
      },
    },
  },
  plugins: [],
};
