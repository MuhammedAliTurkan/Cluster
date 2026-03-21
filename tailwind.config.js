/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
      colors: {
        // Cluster brand palette — emerald/teal accent
        accent: {
          DEFAULT: '#10b981', // emerald-500
          light: '#34d399',   // emerald-400
          dark: '#059669',    // emerald-600
          subtle: 'rgba(16, 185, 129, 0.12)',
        },
        // Surface colors
        surface: {
          0: '#0c0d0f',   // deepest bg
          1: '#111214',   // sidebar bg
          2: '#16181c',   // main bg
          3: '#1c1e22',   // card/panel bg
          4: '#22252a',   // elevated
          5: '#2a2d33',   // hover
          6: '#33363d',   // active/pressed
        },
        // Border
        border: {
          DEFAULT: '#1e2025',
          light: '#2a2d33',
          hover: '#3a3d44',
        },
      },
      borderRadius: {
        squircle: '22%', // for avatar squircles
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translate(-50%, 20px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
      },
    },
  },
  plugins: [],
}
