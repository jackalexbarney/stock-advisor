export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#080b10', 900: '#0d1117', 800: '#161b22',
          700: '#21262d', 600: '#30363d', 500: '#6e7681',
          400: '#8b949e', 300: '#c9d1d9', 200: '#e6edf3',
        },
        accent:  { DEFAULT: '#2563eb', dim: '#1d4ed8' },
        good:    '#4ade80',
        bad:     '#f87171',
        warn:    '#fbbf24',
        bull:    '#22c55e',
        bear:    '#ef4444',
      },
    },
  },
  plugins: [],
};
