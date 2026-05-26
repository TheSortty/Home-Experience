'use client';

export default function ComunicacionClient() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
      <div className="lg:col-span-1 formal-card p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Plantillas</h3>
        <div className="space-y-2">
          {['Bienvenida Inicial', 'Recordatorio de Pago', 'Instrucciones Pre-Curso', 'Felicitaciones Graduación'].map((template) => (
            <div key={template} className="p-3 bg-slate-50 border border-slate-200 rounded-sm hover:border-blue-400 cursor-pointer transition-colors">
              <span className="text-sm font-medium text-slate-700">{template}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2 formal-card p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Enviar Comunicado</h3>
        <div className="space-y-4">
          <select className="w-full p-2 bg-white border border-slate-200 rounded-sm text-sm">
            <option>Todos los Alumnos Activos</option>
          </select>
          <input type="text" className="w-full p-2 bg-white border border-slate-200 rounded-sm text-sm" placeholder="Asunto..." />
          <textarea className="w-full p-3 bg-white border border-slate-200 rounded-sm text-sm h-40" placeholder="Mensaje..."></textarea>
          <button className="px-6 py-2 bg-slate-900 text-white font-bold rounded-sm">Enviar Comunicado</button>
        </div>
      </div>
    </div>
  );
}
