import { useId } from 'react';

// Ilustraciones de la página del programa (diseño "Campus HOME").
// SVG inline, sin librerías. Son estáticas a propósito: animadas se veían a saltos.

/** Fondo del panel del hero: halo, anillos y estrellas sobre azul profundo. */
export function HeroCielo() {
  // id fijo (uno por página): este componente se usa desde un Server Component.
  const glow = 'hero-glow';
  return (
    <svg viewBox="0 0 431 290" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="absolute inset-0 w-full h-full">
      <defs>
        <radialGradient id={glow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7DD3E8" stopOpacity="0.45" />
          <stop offset="1" stopColor="#7DD3E8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="330" cy="70" r="170" fill={`url(#${glow})`} />
      <g fill="none" stroke="#7DD3E8" strokeWidth="1.5" opacity="0.35">
        <circle cx="330" cy="70" r="60" />
        <circle cx="330" cy="70" r="100" />
        <circle cx="330" cy="70" r="140" />
      </g>
      <g fill="#DDF3F9">
        <circle cx="60" cy="50" r="1.6" />
        <circle cx="150" cy="30" r="1.3" />
        <circle cx="250" cy="110" r="1.5" />
        <circle cx="390" cy="180" r="1.3" />
        <circle cx="40" cy="130" r="1.3" />
      </g>
    </svg>
  );
}

/** Olas y estrellas del fondo de la tarjeta de bitácora. */
export function BitacoraMar() {
  return (
    <svg width="260" height="96" viewBox="0 0 260 96" aria-hidden="true" className="absolute right-0 bottom-0">
      <path d="M0 78 q13 -7 26 0 t26 0 t26 0 t26 0 t26 0 t26 0 t26 0 t26 0 t26 0 t26 0" fill="none" stroke="#1D4A5C" strokeWidth="2" />
      <path d="M-13 90 q13 -7 26 0 t26 0 t26 0 t26 0 t26 0 t26 0 t26 0 t26 0 t26 0 t26 0 t26 0" fill="none" stroke="#173F4F" strokeWidth="2" />
      <circle cx="200" cy="22" r="1.6" fill="#DDEBF1" />
      <circle cx="236" cy="40" r="1.3" fill="#DDEBF1" />
      <path d="M168 14 L170 21 L177 23 L170 25 L168 32 L166 25 L159 23 L166 21 Z" fill="#F2C46B" />
    </svg>
  );
}

/** Brújula de la bitácora. */
export function Brujula() {
  return (
    <span className="relative w-12 h-12 rounded-full bg-[#13394A] border border-[#2B5566] flex items-center justify-center shrink-0">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" stroke="#F2C46B" strokeWidth="1.5" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2" stroke="#F2C46B" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15.8 8.2l-2.3 5.3-5.3 2.3 2.3-5.3z" fill="#F2C46B" />
        <circle cx="12" cy="12" r="1.3" fill="#0C2733" />
      </svg>
    </span>
  );
}

/** Hoja de papel de las lecturas. */
export function HojaLectura() {
  return (
    <svg width="32" height="40" viewBox="0 0 34 42" aria-hidden="true" className="shrink-0">
      <path d="M3 1h20l10 10v28a2 2 0 01-2 2H3a2 2 0 01-2-2V3a2 2 0 012-2z" fill="#FFFFFF" stroke="#E2D3B0" />
      <path d="M23 1v8a2 2 0 002 2h8" fill="#F3EAD6" stroke="#E2D3B0" />
      <path d="M7 19h19M7 24.5h19M7 30h12" stroke="#D6C49C" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Miniatura con play de los videos. */
export function MiniaturaVideo() {
  return (
    <span className="relative w-16 h-11 rounded-lg bg-[#0C2733] shrink-0 flex items-center justify-center overflow-hidden">
      <span className="absolute inset-x-0 bottom-0 h-3.5 bg-[#103848]" />
      <span className="relative w-[22px] h-[22px] rounded-full bg-[#FFFFFF] text-[#0C2733] flex items-center justify-center">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1.6l5.2 3.4L3 8.4z" fill="currentColor" /></svg>
      </span>
    </span>
  );
}

/** Onda decorativa del Astillero. */
export function OndaAstillero() {
  let d = 'M0 6 q9 -6 18 0';
  for (let i = 0; i < 49; i++) d += ' t18 0';
  return (
    <svg width="100%" height="12" viewBox="0 0 900 12" preserveAspectRatio="none" aria-hidden="true" className="block">
      <path d={d} fill="none" stroke="#F3CF7A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Halo de lámpara y estrellas del fondo de la biblioteca. */
export function BibliotecaCielo() {
  const glow = useId();
  return (
    <svg width="380" height="360" viewBox="0 0 380 360" aria-hidden="true" className="absolute -left-2.5 -top-2.5">
      <defs>
        <radialGradient id={glow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#F2C46B" stopOpacity="0.28" />
          <stop offset="1" stopColor="#F2C46B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="180" cy="130" r="170" fill={`url(#${glow})`} />
      <g fill="#DDEBF1">
        <circle cx="50" cy="50" r="1.4" />
        <circle cx="300" cy="36" r="1.2" />
        <circle cx="340" cy="120" r="1.4" />
        <circle cx="34" cy="140" r="1.2" />
      </g>
      <g>
        <path d="M180 40 L183 52 L195 55 L183 58 L180 70 L177 58 L165 55 L177 52 Z" fill="#F2C46B" />
        <path d="M232 78 L233.8 84 L240 85.8 L233.8 87.6 L232 94 L230.2 87.6 L224 85.8 L230.2 84 Z" fill="#F7DDA0" />
      </g>
    </svg>
  );
}

// ─── Personajes de Misiones ──────────────────────────────────────────────────
// Una serie de marineros, cada uno en su puesto del barco. La misión N usa el
// personaje N; mientras falten, se repiten. Para sumar uno nuevo: escribir su
// Escena (viewBox 300×220, se recorta desde abajo con xMidYMax slice) y
// agregarla a PERSONAJES.

function EscenaTripulante() {
  const torso = useId();
  return (
    <svg viewBox="0 0 300 220" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
      <defs>
        <clipPath id={torso}><rect x="132" y="102" width="48" height="58" rx="14" /></clipPath>
      </defs>
      <rect width="300" height="220" fill="#EDE7FB" />
      <circle cx="238" cy="58" r="38" fill="#F5C76B" opacity="0.25" />
      <circle cx="238" cy="58" r="26" fill="#F5C76B" />
      <g fill="#FFFFFF" opacity="0.9">
        <ellipse cx="70" cy="46" rx="28" ry="9" />
        <ellipse cx="92" cy="40" rx="18" ry="8" />
        <ellipse cx="190" cy="92" rx="22" ry="7" />
      </g>
      <rect y="118" width="300" height="60" fill="#C9B9F6" />
      <path d="M0 134 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="#A78BFA" strokeWidth="2" opacity="0.8" />
      <path d="M-12 154 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="#A78BFA" strokeWidth="2" opacity="0.6" />
      <g fill="none" stroke="#5B4B8A" strokeWidth="2" strokeLinecap="round">
        <path d="M56 78 q6 -7 12 0 q6 -7 12 0" />
        <path d="M88 98 q4 -5 8 0 q4 -5 8 0" />
      </g>
      <rect y="172" width="300" height="48" fill="#8A6A45" />
      <rect y="172" width="300" height="4" fill="#A98761" />
      <g stroke="#6B4A2E" strokeWidth="1.5" opacity="0.6">
        <path d="M0 192 H300" />
        <path d="M0 208 H300" />
        <path d="M60 176 V192 M150 192 V208 M240 176 V192 M100 208 V220 M200 208 V220" />
      </g>
      <g fill="#6B4A2E">
        <rect x="0" y="146" width="300" height="5" rx="2" />
        <rect x="16" y="146" width="6" height="28" />
        <rect x="84" y="146" width="6" height="28" />
        <rect x="214" y="146" width="6" height="28" />
        <rect x="282" y="146" width="6" height="28" />
      </g>
      <g>
        <circle cx="272" cy="126" r="14" fill="none" stroke="#F5A524" strokeWidth="7" />
        <circle cx="272" cy="126" r="14" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeDasharray="11 11" />
      </g>
      <rect x="226" y="140" width="32" height="38" rx="8" fill="#A9773F" />
      <rect x="226" y="148" width="32" height="4" fill="#5B3A1A" />
      <rect x="226" y="166" width="32" height="4" fill="#5B3A1A" />
      <g fill="none" stroke="#D9B77A" strokeWidth="4">
        <circle cx="46" cy="186" r="13" />
        <circle cx="46" cy="186" r="7" />
      </g>
      {/* Tripulante */}
      <rect x="139" y="152" width="13" height="24" rx="4" fill="#1E293B" />
      <rect x="160" y="152" width="13" height="24" rx="4" fill="#1E293B" />
      <rect x="135" y="172" width="20" height="8" rx="3" fill="#0F172A" />
      <rect x="157" y="172" width="20" height="8" rx="3" fill="#0F172A" />
      <g transform="rotate(-8 112 134)">
        <rect x="98" y="116" width="30" height="40" rx="3" fill="#7C3AED" />
        <rect x="98" y="116" width="5" height="40" rx="2" fill="#5B21B6" />
        <rect x="118" y="116" width="3" height="40" fill="#E8C170" />
        <rect x="106" y="124" width="10" height="2" fill="#DDD3FA" />
        <rect x="106" y="130" width="8" height="2" fill="#DDD3FA" />
      </g>
      <g clipPath={`url(#${torso})`}>
        <rect x="132" y="102" width="48" height="58" fill="#FFFFFF" />
        <rect x="132" y="114" width="48" height="6" fill="#7C3AED" />
        <rect x="132" y="128" width="48" height="6" fill="#7C3AED" />
        <rect x="132" y="142" width="48" height="6" fill="#7C3AED" />
      </g>
      <path d="M146 102 L156 116 L166 102 Z" fill="#F5A524" />
      <path d="M136 114 Q116 124 118 140" fill="none" stroke="#E8EAF2" strokeWidth="11" strokeLinecap="round" />
      <circle cx="118" cy="142" r="6" fill="#F2C9A0" />
      <g>
        <path d="M176 114 Q198 110 202 90" fill="none" stroke="#E8EAF2" strokeWidth="11" strokeLinecap="round" />
        <circle cx="202" cy="85" r="6" fill="#F2C9A0" />
      </g>
      <circle cx="156" cy="82" r="20" fill="#F2C9A0" />
      <path d="M136 80 A20 20 0 0 1 176 80 Z" fill="#F8FAFC" />
      <rect x="135" y="76" width="42" height="6" rx="3" fill="#6D28D9" />
      <circle cx="149" cy="87" r="2.2" fill="#1E293B" />
      <circle cx="163" cy="87" r="2.2" fill="#1E293B" />
      <path d="M150 94 Q156 99 162 94" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EscenaVigia() {
  const glow = useId();
  return (
    <svg viewBox="0 0 300 220" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
      <defs>
        <radialGradient id={glow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#F7DDA0" stopOpacity="0.6" />
          <stop offset="1" stopColor="#F7DDA0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="220" fill="#1E1B4B" />
      <g fill="#E0E7FF">
        <circle cx="30" cy="30" r="1.6" />
        <circle cx="70" cy="64" r="1.3" />
        <circle cx="110" cy="26" r="1.5" />
        <circle cx="200" cy="30" r="1.3" />
        <circle cx="270" cy="96" r="1.5" />
        <circle cx="20" cy="110" r="1.3" />
        <circle cx="252" cy="140" r="1.2" />
      </g>
      <circle cx="240" cy="50" r="20" fill="#F7DDA0" />
      <circle cx="248" cy="44" r="18" fill="#1E1B4B" />
      <path d="M0 178 Q34 146 76 178 Z" fill="#2A2870" />
      <rect x="47" y="150" width="6" height="26" fill="#C7D2FE" />
      <circle cx="50" cy="147" r="3" fill="#F7DDA0" />
      <rect y="176" width="300" height="24" fill="#312E81" />
      <path d="M0 186 q12 -5 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="#4F46E5" strokeWidth="2" opacity="0.8" />
      <rect y="198" width="300" height="22" fill="#6B4A2E" />
      <rect y="198" width="300" height="3" fill="#8A6A45" />
      <path d="M150 44 L14 198 M150 44 L286 198" stroke="#8A6A45" strokeWidth="1.5" opacity="0.55" />
      <rect x="146" y="40" width="8" height="160" fill="#8A6A45" />
      <path d="M154 42 L192 52 L154 62 Z" fill="#F5A524" />
      {/* Vigía */}
      <g transform="rotate(8 118 120)">
        <rect x="104" y="106" width="24" height="32" rx="3" fill="#8B5CF6" />
        <rect x="104" y="106" width="4" height="32" rx="2" fill="#5B21B6" />
        <rect x="120" y="106" width="3" height="32" fill="#E8C170" />
      </g>
      <rect x="134" y="98" width="32" height="44" rx="10" fill="#0A7C97" />
      <rect x="137" y="99" width="26" height="7" rx="3" fill="#F5A524" />
      <path d="M138 108 Q122 116 120 128" fill="none" stroke="#08677E" strokeWidth="10" strokeLinecap="round" />
      <circle cx="120" cy="130" r="5.5" fill="#F2C9A0" />
      <circle cx="150" cy="80" r="17" fill="#F2C9A0" />
      <path d="M133 76 A17 17 0 0 1 167 76 Z" fill="#E0A93B" />
      <rect x="132" y="72" width="36" height="7" rx="3" fill="#B7791F" />
      <circle cx="150" cy="58" r="4" fill="#B7791F" />
      <circle cx="146" cy="84" r="2" fill="#1E293B" />
      <circle cx="157" cy="84" r="2" fill="#1E293B" />
      <path d="M147 91 Q152 94 157 91" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
      <path d="M162 108 Q176 106 184 92" fill="none" stroke="#08677E" strokeWidth="10" strokeLinecap="round" />
      <g transform="rotate(-30 186 88)">
        <rect x="184" y="83" width="44" height="10" rx="3" fill="#E8C170" />
        <rect x="218" y="80" width="14" height="16" rx="3" fill="#B7791F" />
        <rect x="196" y="83" width="3" height="10" fill="#B7791F" />
      </g>
      <circle cx="186" cy="89" r="5.5" fill="#F2C9A0" />
      <path d="M252 66 L254 73 L261 75 L254 77 L252 84 L250 77 L243 75 L250 73 Z" fill="#F7DDA0" />
      <rect x="114" y="130" width="72" height="38" rx="6" fill="#A9773F" />
      <path d="M134 130 V168 M150 130 V168 M166 130 V168" stroke="#7A5230" strokeWidth="2" />
      <rect x="108" y="125" width="84" height="9" rx="4" fill="#7A5230" />
      <circle cx="104" cy="152" r="24" fill={`url(#${glow})`} />
      <path d="M104 132 V140" stroke="#5B3A1A" strokeWidth="2" />
      <rect x="99" y="140" width="10" height="14" rx="2" fill="#F7DDA0" />
    </svg>
  );
}

export const PERSONAJES: { nombre: string; Escena: () => React.JSX.Element }[] = [
  { nombre: 'Tripulante', Escena: EscenaTripulante },
  { nombre: 'Vigía', Escena: EscenaVigia },
];

/** Personaje de la misión N (desde 1). */
export function personajeDeMision(n: number) {
  return PERSONAJES[(n - 1) % PERSONAJES.length];
}
