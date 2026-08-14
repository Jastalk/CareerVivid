/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                "primary": {
                    DEFAULT: "#4a4392",
                    50: "#EEF2FF",
                    100: "#E0E7FF",
                    200: "#C7D2FE",
                    300: "#A5B4FC",
                    400: "#7D78C9",
                    500: "#5B5599",
                    600: "#4A4392",
                    700: "#37316F",
                    800: "#4338A8",
                    900: "#312E81",
                    950: "#1E1B4B",
                    dark: "#37316F",
                    light: "#7D78C9",
                },
                "promax": {
                    start: "#4f46e5", // Indigo
                    end: "#9333ea",   // Purple gradient end
                },
                "background": {
                    light: "#fafafa",
                    dark: "#09090b", // Deeper dark mode
                },
                "surface": {
                    light: "#ffffff",
                    dark: "#18181b",
                    accent: "#27272a",
                },
                "text": {
                    main: { light: "#0f172a", dark: "#f8fafc" },
                    muted: { light: "#64748b", dark: "#94a3b8" },
                },
                "border": {
                    light: "#e2e8f0",
                    dark: "#27272a",
                },
            },
            fontFamily: {
                "display": ["Plus Jakarta Sans", "sans-serif"],
                "body": ["Inter", "sans-serif"],
            },
            transitionTimingFunction: {
                "spring": "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                "spring-bouncy": "cubic-bezier(0.34, 1.56, 0.64, 1)",
                "ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
            },
            animation: {
                "glow": "glow 2s ease-in-out infinite alternate",
                "shimmer": "shimmer 2s linear infinite",
            },
            keyframes: {
                glow: {
                    "0%": { boxShadow: "0 0 10px rgba(79, 70, 229, 0.2)" },
                    "100%": { boxShadow: "0 0 20px rgba(147, 51, 234, 0.6)" },
                },
                shimmer: {
                    from: { backgroundPosition: "200% 0" },
                    to: { backgroundPosition: "-200% 0" },
                },
            },
            borderRadius: {
                "DEFAULT": "8px",
                "lg": "12px",
                "xl": "16px",
                "2xl": "24px",
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/container-queries'),
        require('@tailwindcss/forms'),
    ],
};
