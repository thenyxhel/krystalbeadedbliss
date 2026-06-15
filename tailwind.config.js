/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:    'var(--bg)',
        surf:  'var(--surf)',
        surf2: 'var(--surf2)',
        tx:    'var(--tx)',
        tx2:   'var(--tx2)',
        gold:  'var(--gold)',
        gold2: 'var(--gold2)',
        pink:  'var(--pink)',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: 'var(--bd)',
      },
    },
  },
  plugins: [],
}
