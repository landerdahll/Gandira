import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-space)', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          lime: '#67bed9',
          bg: '#111111',
          card: '#1a1a1a',
          border: '#252525',
        },
        green: {
          400: '#67bed9',
          500: '#4aaec9',
          700: '#2d7d95',
          800: '#1f5c6e',
          900: '#0f2e38',
        },
      },
    },
  },
  plugins: [],
};

export default config;
