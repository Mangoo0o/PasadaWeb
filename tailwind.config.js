/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Stitch Bauang Civic Transit Theme Tokens
        primary: {
          DEFAULT: '#003f87',
          container: '#0056b3',
          fixed: '#d7e2ff',
          'fixed-dim': '#acc7ff',
          'on-fixed': '#001a40',
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#bbd0ff',
        },
        secondary: {
          DEFAULT: '#705d00',
          container: '#fcd400',
          fixed: '#ffe16d',
          'fixed-dim': '#e9c400',
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#6e5c00',
        },
        tertiary: {
          DEFAULT: '#004d10',
          container: '#13671f',
          fixed: '#a3f69c',
          'fixed-dim': '#88d982',
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#91e38b',
        },
        background: '#f3faff',
        'on-background': '#071e27',
        surface: {
          DEFAULT: '#f3faff',
          dim: '#c7dde9',
          bright: '#f3faff',
          tint: '#115cb9',
          variant: '#cfe6f2',
          'container-lowest': '#ffffff',
          'container-low': '#e6f6ff',
          container: '#dbf1fe',
          'container-high': '#d5ecf8',
          'container-highest': '#cfe6f2',
        },
        'on-surface': {
          DEFAULT: '#071e27',
          variant: '#424752',
        },
        outline: {
          DEFAULT: '#727784',
          variant: '#c2c6d4',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': {
          DEFAULT: '#ffffff',
          container: '#93000a',
        },
        // Brand convenience aliases
        brand: {
          50: '#e6f6ff',
          100: '#dbf1fe',
          200: '#cfe6f2',
          300: '#acc7ff',
          400: '#0056b3',
          500: '#003f87', // Bauang Blue
          600: '#00326e',
          700: '#002654',
          800: '#001a40',
          900: '#000f28',
          yellow: '#fcd400',
          'yellow-dark': '#705d00',
        }
      },
      borderRadius: {
        'DEFAULT': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
        '2xl': '2rem',
        'full': '9999px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'stitch-sm': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'stitch-md': '0 4px 24px rgba(0, 63, 135, 0.08)',
        'stitch-lg': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'stitch-sheet': '0 -8px 40px rgba(0, 0, 0, 0.15)',
      }
    },
  },
  plugins: [],
}
