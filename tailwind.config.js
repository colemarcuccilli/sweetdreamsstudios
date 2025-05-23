/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                background: '#303036',
                foreground: '#FEFFFE',
                'accent-red': '#F2542D',
                'accent-green': '#669D31',
                'accent-blue': '#2081C3',
                white: '#FEFFFE',
                black: '#303036',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fade-in 0.5s ease-out',
                'slide-up': 'slide-up 0.5s ease-out',
                'slide-down': 'slide-down 0.5s ease-out',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'slide-down': {
                    '0%': { transform: 'translateY(-20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}