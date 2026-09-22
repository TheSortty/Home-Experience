// Color por nombre de programa, determinístico (mismo nombre → mismo color
// entre renders, sesiones y vistas). Compartido entre calendario y comunidad
// para que la asociación visual programa ↔ color sea consistente en todo el
// campus.
//
// Las clases Tailwind están escritas literales (no interpoladas) para que el
// purge las detecte y entren en el bundle. Si agregás colores nuevos, mantené
// las clases como strings completos.
const PROGRAM_PALETTE: { dot: string; chip: string; border: string; text: string }[] = [
  { dot: 'bg-[#00A9CE]',   chip: 'bg-[#00A9CE]/10 text-[#00A9CE]',   border: 'border-[#00A9CE]',   text: 'text-[#00A9CE]'   },
  { dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700',  border: 'border-emerald-500', text: 'text-emerald-600' },
  { dot: 'bg-violet-500',  chip: 'bg-violet-100 text-violet-700',    border: 'border-violet-500',  text: 'text-violet-600'  },
  { dot: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-700',      border: 'border-amber-500',   text: 'text-amber-600'   },
  { dot: 'bg-rose-500',    chip: 'bg-rose-100 text-rose-700',        border: 'border-rose-500',    text: 'text-rose-600'    },
  { dot: 'bg-indigo-500',  chip: 'bg-indigo-100 text-indigo-700',    border: 'border-indigo-500',  text: 'text-indigo-600'  },
  { dot: 'bg-teal-500',    chip: 'bg-teal-100 text-teal-700',        border: 'border-teal-500',    text: 'text-teal-600'    },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function colorForProgram(name: string) {
  return PROGRAM_PALETTE[hashString(name) % PROGRAM_PALETTE.length];
}
