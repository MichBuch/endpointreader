/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        'neon-card':   '0 0 30px rgba(6,182,212,0.1)',
        'neon-btn':    '0 0 20px rgba(6,182,212,0.3)',
        'neon-input':  'inset 0 0 10px rgba(6,182,212,0.1)',
      }
    }
  },
  plugins: []
}
