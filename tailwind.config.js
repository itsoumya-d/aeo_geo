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
                background: '#eef4f9',
                surface: '#ffffff',
                surfaceHighlight: '#f6faff',

                primary: {
                    DEFAULT: '#2f8fff',
                    hover: '#2179e0',
                    foreground: '#ffffff',
                    glow: 'rgba(47, 143, 255, 0.28)'
                },
                secondary: {
                    DEFAULT: '#d7b44a',
                    hover: '#c09b36',
                    foreground: '#241b05',
                },
                cta: {
                    DEFAULT: '#2f8fff',
                    hover: '#2179e0',
                },
                text: {
                    primary: '#0f172a',
                    secondary: '#516174',
                    muted: '#7d8da1',
                },
                border: '#d6e4f0',
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
                'glow': '0 0 22px -6px rgba(47, 143, 255, 0.24)',
                'glow-lg': '0 0 34px -8px rgba(47, 143, 255, 0.28)',
                'glow-cyan': '0 0 20px -6px rgba(95, 225, 240, 0.22)',
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
                'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #f6faff 0deg, #edf4fa 180deg, #f6faff 360deg)',
            }
        },
    },
    plugins: [],
}
