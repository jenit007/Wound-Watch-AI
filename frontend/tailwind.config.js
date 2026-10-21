/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: { ink: '#17324d', teal: '#0f9f95', mist: '#f5f8fb' }, boxShadow: { soft: '0 10px 35px rgba(25, 56, 84, .06)' } } },
  plugins: [],
}