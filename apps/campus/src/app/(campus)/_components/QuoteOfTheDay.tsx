// Citas del campus — placeholder hasta que el equipo de HOME las reemplace
// con voces reales del staff/coaches/programa. Si vas a cambiarlas, mantené
// el tono: corto, evocativo, evitá la frase motivacional de Instagram.
const QUOTES: { text: string; attr?: string }[] = [
  { text: 'Sostener el proceso es más amoroso que apurar el resultado.' },
  { text: 'Lo que evitás en silencio, te elige el doble.' },
  { text: 'Volver a casa no es un destino, es una forma de mirar.' },
  { text: 'El cambio no se decide. Se atraviesa.' },
  { text: 'Lo que entiendas hoy es exactamente lo que necesitabas entender.' },
  { text: 'Detenerse también es avanzar.' },
  { text: 'No tenés que llegar a ningún lado. Ya estás acá.' },
  { text: 'Lo que se nombra, se afloja.' },
  { text: 'La paciencia no es esperar: es seguir presente mientras esperás.' },
  { text: 'Hay procesos que no se entienden, se habitan.' },
];

function getDayOfYearAR(): number {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  const start = Date.UTC(y, 0, 0);
  const today = Date.UTC(y, m - 1, d);
  return Math.floor((today - start) / 86400000);
}

export default function QuoteOfTheDay() {
  const quote = QUOTES[getDayOfYearAR() % QUOTES.length];
  return (
    <div className="mt-6 pt-6 border-t border-cream-deep flex items-start gap-3">
      <span className="font-serif text-3xl text-terra leading-none -mt-1">“</span>
      <div>
        <p className="font-serif text-lg md:text-xl italic text-ink leading-snug">
          {quote.text}
        </p>
        {quote.attr && (
          <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-medium">
            — {quote.attr}
          </p>
        )}
      </div>
    </div>
  );
}
