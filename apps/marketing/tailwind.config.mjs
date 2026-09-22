/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/layouts/**/*.{js,ts,jsx,tsx,mdx}',
    './src/ui/**/*.{js,ts,jsx,tsx,mdx}',
    './src/contexts/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        serif: ['var(--font-fraunces)', 'Fraunces', 'Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      colors: {
        'celeste-strong': '#00A9CE',
        'celeste-soft': '#8BD8DF',
        'sand-light': '#EDE7E1',
        'google-grey-900': '#2F3034',
        // Warm palette — used sparingly for emotional/honor moments
        // (completed cycles, intimate cards, quotes). The celeste stays
        // as the functional accent; terra appears where the app should
        // feel personal rather than utilitarian.
        terra: '#C97B5C',
        'terra-soft': '#E8B79C',
        'terra-deep': '#A55E42',
        cream: '#FAF6F1',
        'cream-deep': '#F1E9DD',
        ink: '#2A2520',
      },
    },
  },
  plugins: [],
}
