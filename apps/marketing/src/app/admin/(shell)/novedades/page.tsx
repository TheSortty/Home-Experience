import { CHANGELOG, type ChangelogItemType } from '@/src/data/changelog';

const TYPE_CONFIG: Record<ChangelogItemType, { label: string; className: string }> = {
  nuevo:    { label: 'Nuevo',    className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  mejorado: { label: 'Mejorado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  corregido:{ label: 'Fix',      className: 'bg-amber-100 text-amber-700 border-amber-200' },
  removido: { label: 'Removido', className: 'bg-red-100 text-red-700 border-red-200' },
};

export default function NovedadesPage() {
  const latest = CHANGELOG[0];

  return (
    <div className="max-w-3xl space-y-10">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Novedades del sistema</h1>
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
            v{latest.version}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Historial de cambios y actualizaciones del panel de administración de Home Experience.
        </p>
      </div>

      {/* Versions */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" aria-hidden="true" />

        <div className="space-y-10">
          {CHANGELOG.map((entry, i) => (
            <div key={entry.version} className="relative pl-8">
              {/* Timeline dot */}
              <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                i === 0
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white border-slate-300'
              }`} />

              {/* Card */}
              <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                i === 0 ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'
              }`}>
                {/* Card header */}
                <div className={`px-5 py-4 border-b ${i === 0 ? 'border-blue-100 bg-blue-50/50' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          i === 0
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}>
                          v{entry.version}
                        </span>
                        <h2 className="text-sm font-bold text-slate-900">{entry.title}</h2>
                        {i === 0 && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                            Última
                          </span>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{entry.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium shrink-0">{entry.date}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="px-5 py-4 space-y-2.5">
                  {entry.items.map((item, j) => {
                    const cfg = TYPE_CONFIG[item.type];
                    return (
                      <div key={j} className="flex items-start gap-3">
                        <span className={`shrink-0 mt-0.5 text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded border ${cfg.className}`}>
                          {cfg.label}
                        </span>
                        <p className="text-sm text-slate-700 leading-relaxed">{item.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-400 text-center pb-4">
        Historial de desarrollo de siendohome.com desde diciembre 2025 · {CHANGELOG.length} versiones
      </p>
    </div>
  );
}
