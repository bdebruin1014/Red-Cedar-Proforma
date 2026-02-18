/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cedar: {
          50: '#f6f3f0',
          100: '#e8e0d8',
          200: '#d4c4b4',
          300: '#b9a08a',
          400: '#a07e66',
          500: '#8b6a4f',
          600: '#745541',
          700: '#5e4436',
          800: '#4d382e',
          900: '#3d2d25',
          950: '#221914',
        },
        slate: {
          850: '#172033',
        }
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
