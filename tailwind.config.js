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
        // Stitch Bauang Civic Transit Theme Tokens (Vibrant Blue & Transit Yellow)
        primary: {
          DEFAULT: '#0052d1',
          container: '#206afa',
          fixed: '#dbe1ff',
          'fixed-dim': '#b3c5ff',
          'on-fixed': '#001849',
          'on-container': '#fefcff',
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#fefcff',
        },
        secondary: {
          DEFAULT: '#565e74',
          container: '#dae2fd',
          fixed: '#dae2fd',
          'fixed-dim': '#bec6e0',
          'on-fixed': '#131b2e',
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#5c647a',
        },
        tertiary: {
          DEFAULT: '#006947',
          container: '#00855b',
          fixed: '#6ffbbe',
          'fixed-dim': '#4edea3',
          'on-fixed': '#002113',
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#f5fff6',
        },
        background: '#f7f9fb',
        'on-background': '#191c1e',
        surface: {
          DEFAULT: '#f7f9fb',
          dim: '#d8dadc',
          bright: '#f7f9fb',
          tint: '#0054d6',
          variant: '#e0e3e5',
          'container-lowest': '#ffffff',
          'container-low': '#f2f4f6',
          container: '#eceef0',
          'container-high': '#e6e8ea',
          'container-highest': '#e0e3e5',
        },
        'on-surface': {
          DEFAULT: '#191c1e',
          variant: '#424655',
        },
        outline: {
          DEFAULT: '#737687',
          variant: '#c2c6d8',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': {
          DEFAULT: '#ffffff',
          container: '#93000a',
        },
        // Stitch Custom Brand Colors
        'bauang-blue': '#276efe',
        'tricycle-yellow': '#fcd400',
        brand: {
          50: '#f0f6ff',
          100: '#dbe9f4',
          200: '#b9dbfd',
          300: '#7cbbfc',
          400: '#3996f8',
          500: '#0052d1', // Stitch Vibrant Blue
          600: '#003fa4',
          700: '#003387',
          800: '#002460',
          900: '#001849',
          yellow: '#fcd400',
          'yellow-dark': '#6e5c00',
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
