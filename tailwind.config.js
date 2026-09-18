/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Every colour here resolves to a token in index.css. If you find
      // yourself reaching for a hex code in a component, add a token instead.
      colors: {
        bg:            'var(--bg)',
        'bg-sunk':     'var(--bg-sunk)',
        surface:       'var(--surface)',
        'surface-2':   'var(--surface-2)',
        ink:           'var(--ink)',
        'ink-2':       'var(--ink-2)',
        'ink-3':       'var(--ink-3)',
        clay:          'var(--clay)',
        'clay-deep':   'var(--clay-deep)',
        'clay-wash':   'var(--clay-wash)',
        brass:         'var(--brass)',
        sage:          'var(--sage)',
        line:          'var(--line)',
        'line-strong': 'var(--line-strong)',
        ok:            'var(--ok)',
        warn:          'var(--warn)',
        bad:           'var(--bad)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        DEFAULT: 'var(--r-md)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
      },
      borderColor: { DEFAULT: 'var(--line)' },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      maxWidth: { measure: 'var(--measure)', page: 'var(--page-max)' },
    },
  },
  plugins: [],
}
