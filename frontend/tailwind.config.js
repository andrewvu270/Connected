/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				// Base surfaces
				bg: "rgb(var(--bg) / <alpha-value>)",
				surface: {
					DEFAULT: "rgb(var(--surface) / <alpha-value>)",
					elevated: "rgb(var(--surface-elevated) / <alpha-value>)",
				},
				card: "rgb(var(--card) / <alpha-value>)",
				
				// Typography
				text: {
					DEFAULT: "rgb(var(--text) / <alpha-value>)",
					secondary: "rgb(var(--text-secondary) / <alpha-value>)",
				},
				muted: {
					DEFAULT: "rgb(var(--muted) / <alpha-value>)",
					light: "rgb(var(--muted-light) / <alpha-value>)",
				},
				
				// Borders
				border: {
					DEFAULT: "rgb(var(--border) / <alpha-value>)",
					subtle: "rgb(var(--border-subtle) / <alpha-value>)",
				},
				
				// Primary brand colors - More vibrant
				primary: {
					DEFAULT: "rgb(var(--primary) / <alpha-value>)",
					hover: "rgb(var(--primary-hover) / <alpha-value>)",
					active: "rgb(var(--primary-active) / <alpha-value>)",
					subtle: "rgb(var(--primary-subtle) / <alpha-value>)",
					muted: "rgb(var(--primary-muted) / <alpha-value>)",
				},
				
				// Vibrant accent colors
				accent: {
					DEFAULT: "rgb(var(--accent) / <alpha-value>)",
					subtle: "rgb(var(--accent-subtle) / <alpha-value>)",
				},
				
				// Semantic colors - More vibrant
				success: {
					DEFAULT: "rgb(var(--success) / <alpha-value>)",
					subtle: "rgb(var(--success-subtle) / <alpha-value>)",
				},
				warning: {
					DEFAULT: "rgb(var(--warning) / <alpha-value>)",
					subtle: "rgb(var(--warning-subtle) / <alpha-value>)",
				},
				error: {
					DEFAULT: "rgb(var(--error) / <alpha-value>)",
					subtle: "rgb(var(--error-subtle) / <alpha-value>)",
				},
				
				// Category-specific vibrant colors
				purple: {
					DEFAULT: "rgb(139, 92, 246)",
					subtle: "rgb(245, 243, 255)",
				},
				orange: {
					DEFAULT: "rgb(249, 115, 22)",
					subtle: "rgb(255, 247, 237)",
				},
				pink: {
					DEFAULT: "rgb(236, 72, 153)",
					subtle: "rgb(253, 242, 248)",
				},
				teal: {
					DEFAULT: "rgb(20, 184, 166)",
					subtle: "rgb(240, 253, 250)",
				},
			},
			fontSize: {
				// Premium type scale
				'display-1': ['64px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
				'display-2': ['48px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
				'headline': ['32px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
				'title': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
				'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
				'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
				'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
				'label': ['12px', { lineHeight: '1.4', letterSpacing: '0.03em', fontWeight: '500' }],
			},
			spacing: {
				// 8px grid system
				'xs': '8px',
				'sm': '12px',
				'md': '16px',
				'lg': '24px',
				'xl': '32px',
				'2xl': '48px',
				'3xl': '64px',
				'4xl': '96px',
			},
			maxWidth: {
				'reading': '65ch',
				'feed': '680px',
			},
			boxShadow: {
				xs: "var(--shadow-xs)",
				sm: "var(--shadow-sm)",
				md: "var(--shadow-md)",
				lg: "var(--shadow-lg)",
				xl: "var(--shadow-xl)",
				"2xl": "var(--shadow-2xl)",
				glow: "var(--shadow-glow)",
				focus: "var(--shadow-focus)",
				// Legacy shadows for compatibility
				soft: "0 14px 40px rgba(0, 0, 0, 0.06)",
				clay: "0 18px 55px rgba(0, 0, 0, 0.08)",
				refined: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)",
			},
			borderRadius: {
				xl: "14px",
				'2xl': "18px",
			},
			transitionDuration: {
				'600': '600ms',
				'800': '800ms',
			},
			transitionTimingFunction: {
				'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
				'in-expo': 'cubic-bezier(0.7, 0, 0.84, 0)',
			},
			animation: {
				'fade-in': 'fadeIn 600ms cubic-bezier(0.16, 1, 0.3, 1)',
				'slide-up': 'slideUp 600ms cubic-bezier(0.16, 1, 0.3, 1)',
				'slide-down': 'slideDown 400ms cubic-bezier(0.16, 1, 0.3, 1)',
				'scale-in': 'scaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
				'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'shimmer': 'shimmer 2s linear infinite',
				'slide-in-right': 'slideInRight 300ms cubic-bezier(0.16, 1, 0.3, 1)',
				'gradient-x': 'gradientX 3s ease infinite',
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				slideUp: {
					'0%': { opacity: '0', transform: 'translateY(16px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				slideDown: {
					'0%': { opacity: '0', transform: 'translateY(-16px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				scaleIn: {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' },
				},
				pulseSoft: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.8' },
				},
				shimmer: {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' },
				},
				slideInRight: {
					'0%': { transform: 'translateX(100%)' },
					'100%': { transform: 'translateX(0)' },
				},
				gradientX: {
					'0%, 100%': { backgroundPosition: '0% 50%' },
					'50%': { backgroundPosition: '100% 50%' },
				},
			},
			backdropBlur: {
				xs: '2px',
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
			},
			backgroundSize: {
				'200%': '200% 200%',
			},
		},
	},
	plugins: [],
};
