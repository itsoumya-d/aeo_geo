/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Mint Night Palette
                background: '#07110f',
                surface: '#0d1917',
                surfaceHighlight: '#17302b',

                primary: {
                    DEFAULT: '#8fe3c8',
                    hover: '#73d6b7',
                    foreground: '#06251f',
                    glow: 'rgba(143, 227, 200, 0.42)'
                },
                secondary: {
                    DEFAULT: '#c6f1e4',
                    hover: '#b0e8d8',
                    foreground: '#06251f',
                },
                cta: {
                    DEFAULT: '#5fcfb0',
                    hover: '#48bc9c',
                },
                text: {
                    primary: '#f1fffb',
                    secondary: '#a8c8be',
                    muted: '#76978e',
                },
                border: '#1b3732',
                success: '#10b981', // Emerald 500
                error: '#ef4444',   // Red 500
                warning: '#f59e0b', // Amber 500
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Space Grotesk', 'sans-serif'],
                mono: ['Fira Code', 'monospace'],
            },
            boxShadow: {
                'glow': '0 0 22px -6px rgba(143, 227, 200, 0.28)',
                'glow-lg': '0 0 34px -8px rgba(143, 227, 200, 0.38)',
                'glow-cyan': '0 0 20px -6px rgba(198, 241, 228, 0.22)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            },
            backdropBlur: {
                'xs': '2px',
            },
            animation: {
                'fade-in': 'fadeIn 0.6s ease-out forwards',
                'slide-up': 'slideUp 0.6s ease-out forwards',
                'slide-down': 'slideDown 0.4s ease-out forwards',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            },
            borderRadius: {
                'card': '16px',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #17302b 0deg, #0d1917 180deg, #17302b 360deg)',
            }
        },
    },
    plugins: [],
}
