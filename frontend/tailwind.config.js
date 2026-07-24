/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd4ff',
          300: '#8eb8ff',
          400: '#5c91f6',
          500: '#3b6eea',
          600: '#2f56c9',
          700: '#2947a3',
        },
        surface: {
          canvas: '#f8fafc',
          default: '#ffffff',
          muted: '#f1f5f9',
          subtle: '#f8fafc',
          inverse: '#111827',
        },
        ink: {
          primary: '#111827',
          secondary: '#475569',
          muted: '#64748b',
          disabled: '#94a3b8',
          inverse: '#ffffff',
        },
        line: {
          default: '#e2e8f0',
          strong: '#cbd5e1',
          focus: '#5c91f6',
        },
        success: '#16a36a',
        warning: '#d97706',
        danger: '#dc2626',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],
      },
      spacing: {
        control: '2.5rem',
        'control-sm': '2rem',
        'control-lg': '3rem',
        card: '1.25rem',
        section: '2rem',
      },
      borderRadius: {
        control: '0.5rem',
        card: '0.75rem',
        surface: '1rem',
      },
      boxShadow: {
        xs: '0 1px 2px rgb(15 23 42 / 0.05)',
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)',
        floating: '0 8px 24px rgb(15 23 42 / 0.10), 0 2px 6px rgb(15 23 42 / 0.05)',
        overlay: '0 20px 48px rgb(15 23 42 / 0.16), 0 8px 16px rgb(15 23 42 / 0.08)',
      },
    },
  },
  plugins: [],
}
