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
                // Deep Space Palette
                background: '#020617', // Slate 950 (Midnight Blue)
                surface: '#0f172a',    // Slate 900
                surfaceHighlight: '#1e293b', // Slate 800

                primary: {
                    DEFAULT: '#8b5cf6', // Violet 500 (Neon Purple)
                    hover: '#7c3aed',   // Violet 600
                    foreground: '#ffffff',
                    glow: 'rgba(139, 92, 246, 0.5)'
                },
                secondary: {
                    DEFAULT: '#06b6d4', // Cyan 500 (Electric Blue)
                    hover: '#0891b2',   // Cyan 600
                    foreground: '#ffffff',
                },
                cta: {
                    DEFAULT: '#f59e0b', // Amber 500
                    hover: '#d97706',   // Amber 600
                },
                text: {
                    primary: '#f8fafc', // Slate 50 (Starlight White)
                    secondary: '#94a3b8', // Slate 400
                    muted: '#64748b',   // Slate 500
                },
                border: '#1e293b', // Slate 800
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
                'glow': '0 0 20px -5px rgba(139, 92, 246, 0.3)', // Purple glow
                'glow-lg': '0 0 30px -5px rgba(139, 92, 246, 0.4)',
                'glow-cyan': '0 0 20px -5px rgba(6, 182, 212, 0.3)',
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
                'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #1e293b 0deg, #0f172a 180deg, #1e293b 360deg)',
            }
        },
    },
    plugins: [],
}
