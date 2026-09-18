/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Every colour resolves to a token in index.css. If you find yourself
      // reaching for a hex code in a component, add a token instead.
      colors: {
        bg:            'var(--bg)',
        'bg-sunk':     'var(--bg-sunk)',
        surface:       'var(--surface)',
        'surface-2':   'var(--surface-2)',
        ink:           'var(--ink)',
        'ink-2':       'var(--ink-2)',
        'ink-3':       'var(--ink-3)',
        accent:        'var(--accent)',
        'accent-deep': 'var(--accent-deep)',
        'accent-wash': 'var(--accent-wash)',
        'on-accent':   'var(--on-accent)',
        gold:          'var(--gold)',
        teal:          'var(--teal)',
        line:          'var(--line)',
        'line-strong': 'var(--line-strong)',
        ok:            'var(--ok)',
        warn:          'var(--warn)',
        bad:           'var(--bad)',
        // The mark's own colours — fixed across themes.
        'brand-pink':   'var(--brand-pink)',
        'brand-orange': 'var(--brand-orange)',
        'brand-yellow': 'var(--brand-yellow)',
        'brand-teal':   'var(--brand-teal)',
        'brand-violet': 'var(--brand-violet)',
        'brand-purple': 'var(--brand-purple)',
      },
      fontFamily: {
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        DEFAULT: 'var(--r-md)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        pill: 'var(--r-pill)',
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
