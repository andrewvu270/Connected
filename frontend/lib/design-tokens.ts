// Design tokens for the Connected app
// Use these constants for consistent styling across components

export const colors = {
  // Base surfaces
  bg: "rgb(251 250 249)", // #FBFAF9
  surface: "rgb(255 255 255)", // #FFFFFF
  surfaceElevated: "rgb(254 254 254)", // #FEFEFE
  
  // Typography
  text: "rgb(23 20 18)", // #171412
  textSecondary: "rgb(68 64 60)", // #44403C
  muted: "rgb(87 83 78)", // #57534E
  mutedLight: "rgb(120 113 108)", // #78716C
  
  // Borders
  border: "rgb(228 225 223)", // #E4E1DF
  borderSubtle: "rgb(245 243 242)", // #F5F3F2
  
  // Primary brand
  primary: "rgb(67 56 202)", // #4338CA
  primaryHover: "rgb(55 48 163)", // #3730A3
  primaryActive: "rgb(49 46 129)", // #312E81
  primarySubtle: "rgb(238 242 255)", // #EEF2FF
  primaryMuted: "rgb(199 210 254)", // #C7D2FE
  
  // Semantic colors
  success: "rgb(5 150 105)", // #059669
  successSubtle: "rgb(236 253 245)", // #ECFDF5
  warning: "rgb(217 119 6)", // #D97706
  warningSubtle: "rgb(255 251 235)", // #FFFBEB
  error: "rgb(220 38 38)", // #DC2626
  errorSubtle: "rgb(254 242 242)", // #FEF2F2
} as const

export const spacing = {
  xs: "8px",
  sm: "12px", 
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
  "3xl": "64px",
  "4xl": "96px",
  "5xl": "128px",
  "6xl": "192px",
} as const

export const typography = {
  display1: {
    fontSize: "64px",
    lineHeight: "1.1",
    letterSpacing: "-0.02em",
    fontWeight: "600"
  },
  display2: {
    fontSize: "48px", 
    lineHeight: "1.2",
    letterSpacing: "-0.02em",
    fontWeight: "600"
  },
  headline: {
    fontSize: "32px",
    lineHeight: "1.3", 
    letterSpacing: "-0.01em",
    fontWeight: "600"
  },
  title: {
    fontSize: "24px",
    lineHeight: "1.4",
    fontWeight: "600"
  },
  bodyLg: {
    fontSize: "18px",
    lineHeight: "1.6",
    fontWeight: "400"
  },
  body: {
    fontSize: "16px",
    lineHeight: "1.6", 
    fontWeight: "400"
  },
  bodySm: {
    fontSize: "14px",
    lineHeight: "1.5",
    fontWeight: "400"
  },
  label: {
    fontSize: "12px",
    lineHeight: "1.4",
    letterSpacing: "0.03em",
    fontWeight: "500"
  }
} as const

export const shadows = {
  xs: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
  sm: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.12)",
  glow: "0 0 0 3px rgba(67, 56, 202, 0.1)",
  focus: "0 0 0 3px rgba(67, 56, 202, 0.12), 0 1px 3px 0 rgba(0, 0, 0, 0.08)"
} as const

export const borderRadius = {
  sm: "6px",
  md: "8px", 
  lg: "12px",
  xl: "14px",
  "2xl": "18px",
  "3xl": "24px",
  full: "9999px"
} as const

export const breakpoints = {
  sm: "640px",
  md: "768px", 
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px"
} as const