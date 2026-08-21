/** @type {import('tailwindcss').Config} */
/*
 * THE BOARD — see DESIGN.md.
 *
 * Two naming layers coexist on purpose:
 *   1. Semantic names (board / bone / rail / strip / struck) — the canonical set.
 *   2. The legacy `surface` / `primary` / `accent` ramps, remapped onto the same
 *      world so any not-yet-rebuilt view degrades into the board rather than
 *      into the old neon theme. `primary` and `accent` are BOTH amber, which
 *      quietly collapses every leftover `from-primary-500 to-accent-500`
 *      gradient into a flat fill.
 */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // ---- Canonical world -------------------------------------
                groove: '#0C0A08',
                board: {
                    DEFAULT: '#16130F',
                    raised: '#221D17',
                    groove: '#0C0A08',
                },
                rail: {
                    DEFAULT: '#3A342B',
                    strong: '#6B6153',
                },
                bone: {
                    DEFAULT: '#F2EBDD',
                    mid: '#C7BFAF',
                    dim: '#A79E8C',
                    faint: '#8A8172',
                },
                strip: {
                    DEFAULT: '#FFB020',
                    bright: '#FFC24D',
                    deep: '#E09400',
                    ink: '#16130F',
                },
                struck: {
                    DEFAULT: '#F0584A',
                    deep: '#B3271B',
                },

                // ---- Legacy ramps, remapped ------------------------------
                surface: {
                    50: '#FBF7EF',
                    100: '#F2EBDD',
                    200: '#E0D9CA',
                    300: '#C7BFAF',
                    400: '#A79E8C',
                    500: '#8A8172',
                    600: '#6B6153',
                    700: '#3A342B',
                    800: '#221D17',
                    900: '#16130F',
                    950: '#0C0A08',
                },
                primary: {
                    50: '#FFF6E5',
                    100: '#FFE9BF',
                    200: '#FFD894',
                    300: '#FFC966',
                    400: '#FFC24D',
                    500: '#FFB020',
                    600: '#E09400',
                    700: '#B37600',
                    800: '#805400',
                    900: '#4D3200',
                    950: '#2B1C00',
                },
                accent: {
                    50: '#FFF6E5',
                    100: '#FFE9BF',
                    200: '#FFD894',
                    300: '#FFC966',
                    400: '#FFC24D',
                    500: '#FFB020',
                    600: '#E09400',
                    700: '#B37600',
                    800: '#805400',
                    900: '#4D3200',
                    950: '#2B1C00',
                },
            },
            fontFamily: {
                sans: ['Archivo', 'system-ui', 'sans-serif'],
                display: ['Archivo', 'system-ui', 'sans-serif'],
                mono: ['"Fragment Mono"', 'ui-monospace', 'monospace'],
            },
            fontSize: {
                label: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.08em' }],
                'ui-sm': ['0.8125rem', { lineHeight: '1.35' }],
                ui: ['0.9375rem', { lineHeight: '1.45' }],
                'ui-lg': ['1.0625rem', { lineHeight: '1.6' }],
                'board-md': ['1.25rem', { lineHeight: '1.2' }],
                'board-lg': ['clamp(1.75rem, 4vw, 2.5rem)', { lineHeight: '1.02' }],
                'board-xl': ['clamp(2.5rem, 7vw, 4.25rem)', { lineHeight: '0.94' }],
            },
            borderRadius: {
                // The board has no rounded corners. Every scale collapses to 0
                // so a stray `rounded-xl` in unrebuilt code cannot reintroduce one.
                none: '0', sm: '0', DEFAULT: '0', md: '0', lg: '0',
                xl: '0', '2xl': '0', '3xl': '0', full: '0',
            },
            spacing: {
                slot: '5.5rem',
                'slot-sm': '4rem',
            },
            boxShadow: {
                // Offset + soft blur only. No zero-offset halos.
                lift: '0 12px 32px -8px rgba(0, 0, 0, 0.7)',
                board: '0 2px 0 0 rgba(0, 0, 0, 0.5)',
                // Legacy glow names, neutralised.
                glow: 'none',
                'glow-lg': 'none',
                'glow-accent': 'none',
            },
            animation: {
                'strip-in': 'stripIn 220ms cubic-bezier(.2,0,0,1) both',
                'slot-in': 'slotIn 160ms cubic-bezier(.2,0,0,1) both',
                // Legacy names, retuned to the single-axis grammar.
                'fade-in': 'boardFade 140ms cubic-bezier(.2,0,0,1) both',
                'slide-up': 'slotIn 160ms cubic-bezier(.2,0,0,1) both',
                'slide-down': 'slotIn 160ms cubic-bezier(.2,0,0,1) both',
                'scale-in': 'boardFade 140ms cubic-bezier(.2,0,0,1) both',
                'spin-slow': 'spin 3s linear infinite',
                'pulse-glow': 'none',
            },
            keyframes: {
                stripIn: {
                    '0%': { transform: 'translateX(-101%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                slotIn: {
                    '0%': { opacity: '0', transform: 'translateX(-6px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                boardFade: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
            transitionTimingFunction: {
                board: 'cubic-bezier(.2,0,0,1)',
            },
            maxWidth: {
                read: '68ch',
                board: '78rem',
            },
        },
    },
    plugins: [],
}
