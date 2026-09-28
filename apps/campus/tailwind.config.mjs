import defaults from 'tailwindcss/colors'
import plugin from 'tailwindcss/plugin'

// ─── Modo oscuro por variables ─────────────────────────────────────────────
// En vez de sumar `dark:` a cada clase, estas familias leen su color de una
// variable CSS. En `.dark` cambian de valor (ver SLATE_DARK / COLOR_DARK):
// los fondos claros se vuelven oscuros y los textos oscuros, claros, en todo
// el campus a la vez. `white` NO entra: se usa como texto sobre botones de
// color; el `bg-white` de las tarjetas se resuelve en globals.css.
const FAMILIES = ['slate', 'red', 'orange', 'amber', 'yellow', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'rose']
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

// Colores de marca del campus: claro → oscuro (hex).
const BRAND = {
  'celeste-strong': ['#00A9CE', '#00A9CE'],
  'celeste-soft': ['#8BD8DF', '#1C5F6E'],
  'sand-light': ['#EDE7E1', '#1C3546'],
  'google-grey-900': ['#2F3034', '#E3E3E6'],
  terra: ['#C97B5C', '#D98C6D'],
  'terra-soft': ['#E8B79C', '#6E4331'],
  'terra-deep': ['#A55E42', '#E8A688'],
  cream: ['#FAF6F1', '#0F2230'],
  'cream-deep': ['#F1E9DD', '#1C3546'],
  ink: ['#2A2520', '#EFE8E0'],
}

// Oscuro, ajustado a WCAG AA (texto ≥ 4.5:1 sobre la tarjeta #0f172a y sobre
// los fondos suaves). slate: escala propia; los grises medios (400–600) se
// aclaran más que una inversión pura, que dejaba el texto secundario ilegible.
const SLATE_DARK = { 50: '#172033', 100: '#1e293b', 200: '#293548', 300: '#3b4a61', 400: '#8b9ab0', 500: '#a3b0c2', 600: '#c3cdd9', 700: '#d6dde6', 800: '#e2e8f0', 900: '#f1f5f9', 950: '#f8fafc' }
// Colores: los tonos de fondo (50–200) pasan a oscuros apenas teñidos (50 y 100 se
// mezclan con la tarjeta para que no queden barrosos); los de texto (500–800), a claros.
const COLOR_DARK = { 50: null, 100: null, 200: '900', 300: '700', 400: '500', 500: '400', 600: '400', 700: '300', 800: '200', 900: '100', 950: '50' }
const mix = (a, b, t) => '#' + [16, 8, 0].map((sh) => Math.round(((parseInt(a.slice(1), 16) >> sh) & 255) * (1 - t) + ((parseInt(b.slice(1), 16) >> sh) & 255) * t).toString(16).padStart(2, '0')).join('')
const darkOf = (f, s) => f === 'slate' ? SLATE_DARK[s] : s === '50' ? mix(defaults[f][950], '#0f172a', 0.8) : s === '100' ? mix(defaults[f][950], '#0f172a', 0.5) : defaults[f][COLOR_DARK[s]]

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}
const ref = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

const colors = {}
const light = {}
const dark = {}
for (const f of FAMILIES) {
  colors[f] = {}
  SHADES.forEach((s) => {
    colors[f][s] = ref(`${f}-${s}`)
    light[`--c-${f}-${s}`] = rgb(defaults[f][s])
    dark[`--c-${f}-${s}`] = rgb(darkOf(f, s))
  })
}
for (const [name, [l, d]] of Object.entries(BRAND)) {
  colors[name] = ref(name)
  light[`--c-${name}`] = rgb(l)
  dark[`--c-${name}`] = rgb(d)
}

// Superficie de tarjetas y paneles (el `bg-white` en oscuro, ver globals.css).
light["--surface"] = "255 255 255"
dark["--surface"] = "15 23 42"

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        serif: ['var(--font-fraunces)', 'Fraunces', 'Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      colors,
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ':root': light, '.dark': { ...dark, 'color-scheme': 'dark' } })
    }),
  ],
}
