// Frase del día del campus. Tono de la formación en coaching de HOME: el
// observador, el lenguaje, la escucha, los quiebres y el aprendizaje. Frases
// claras, sin dobles sentidos y sin autor (no atribuir citas que no se puedan
// verificar). El equipo puede reemplazarlas por frases propias del programa.
const QUOTES: { text: string; attr?: string }[] = [
  { text: 'Cambiar la mirada es el primer paso para cambiar el resultado.' },
  { text: 'Cada conversación es una oportunidad de crear algo nuevo.' },
  { text: 'Escuchar de verdad es dejar de preparar la respuesta.' },
  { text: 'Un quiebre no es un final: es una invitación a aprender.' },
  { text: 'Lo que decís también construye lo que vivís.' },
  { text: 'Aprender empieza cuando te animás a decir “no sé”.' },
  { text: 'Tus juicios dicen tanto de vos como de lo que juzgás.' },
  { text: 'Pedir ayuda también es un acto de liderazgo.' },
  { text: 'Un compromiso cumplido vale más que cien promesas.' },
  { text: 'Hoy podés elegir desde dónde mirar lo que te pasa.' },
  { text: 'Las emociones no se esconden: se escuchan.' },
  { text: 'Nadie aprende por vos, pero nadie aprende solo.' },
  { text: 'Cada día es una oportunidad de ser el observador que querés ser.' },
  { text: 'Para ver algo distinto, a veces hay que hacer preguntas distintas.' },
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
