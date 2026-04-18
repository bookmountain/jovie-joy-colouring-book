import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: 'var(--cream)',
        'cream-2': 'var(--cream-2)',
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        tomato: 'var(--tomato)',
        sun: 'var(--sun)',
        sky: 'var(--sky)',
        berry: 'var(--berry)',
        mint: 'var(--mint)',
        lilac: 'var(--lilac)',
      },
      fontFamily: {
        display: ['Sniglet', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
};
export default config;
