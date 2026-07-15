/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       'var(--bg)',
        surf:     'var(--surf)',
        surf2:    'var(--surf2)',
        tx:       'var(--tx)',
        tx2:      'var(--tx2)',
        purple:   'var(--purple)',
        purple2:  'var(--purple2)',
        lavender: 'var(--lavender)',
        silver:   'var(--silver)',
        gold:     'var(--gold)',
        gold2:    'var(--gold2)',
        pink:     'var(--pink)',
      },
      fontFamily: {
        display: ['Cormorant', 'Georgia', 'serif'],
        serif:   ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:    ['Outfit', 'system-ui', 'sans-serif'],
        script:  ['Dancing Script', 'cursive'],
      },
      borderColor: {
        DEFAULT: 'var(--bd)',
      },
    },
  },
  plugins: [],
}
