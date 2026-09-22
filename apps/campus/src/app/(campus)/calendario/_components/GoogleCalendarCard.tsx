'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { IoCalendarOutline, IoCheckmarkCircle, IoWarningOutline } from 'react-icons/io5';

export interface GoogleCalendarStatus {
  connected: boolean;
  googleEmail: string | null;
  syncedEvents: number;
  lastError: string | null;
}

/**
 * Conectar / desconectar el Google Calendar del alumno.
 *
 * El alta va por redirect (no fetch): el consentimiento de Google es una página
 * suya, no se puede embeber.
 */
export default function GoogleCalendarCard({
  status,
  notice,
}: {
  status: GoogleCalendarStatus;
  notice: string | null;
}) {
  const [busy, setBusy] = useState(false);

  const disconnect = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/google-calendar/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error(String(res.status));
      toast.success('Calendario desconectado. Te sacamos los encuentros agendados.');
      window.location.href = '/calendario';
    } catch {
      toast.error('No pudimos desconectarlo. Probá de nuevo.');
      setBusy(false);
    }
  };

  if (!status.connected) {
    return (
      <div className="shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-[#00A9CE]/10 text-[#00A9CE] flex items-center justify-center shrink-0">
            <IoCalendarOutline size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">Sumá los encuentros a tu Google Calendar</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Se agendan solos y, si cambiamos una fecha, se te actualiza sin que hagas nada.
            </p>
            {notice && <Notice code={notice} />}
          </div>
        </div>
        <a
          href="/api/google-calendar/connect"
          className="shrink-0 text-sm font-bold px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors text-center"
        >
          Conectar
        </a>
      </div>
    );
  }

  return (
    <div className="shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="flex items-start gap-3 min-w-0">
        <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
          <IoCheckmarkCircle size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">
            Google Calendar conectado
            {status.googleEmail && <span className="font-medium text-slate-500"> · {status.googleEmail}</span>}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {status.syncedEvents > 0
              ? `${status.syncedEvents} encuentro${status.syncedEvents === 1 ? '' : 's'} agendado${status.syncedEvents === 1 ? '' : 's'}.`
              : 'Todavía no hay encuentros futuros para agendar.'}
          </p>
          {status.lastError && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <IoWarningOutline className="shrink-0" />
              Hubo un problema al sincronizar. Probá desconectar y volver a conectar.
            </p>
          )}
          {notice && <Notice code={notice} />}
        </div>
      </div>
      <button
        type="button"
        onClick={disconnect}
        disabled={busy}
        className="shrink-0 text-sm font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        {busy ? 'Desconectando…' : 'Desconectar'}
      </button>
    </div>
  );
}

function Notice({ code }: { code: string }) {
  const messages: Record<string, string> = {
    connected: '¡Listo! Ya tenés los encuentros en tu calendario.',
    cancelled: 'Cancelaste la autorización, no se conectó nada.',
    invalid_state: 'El enlace expiró. Probá conectar de nuevo.',
    no_refresh_token: 'Google no nos dio permiso permanente. Probá de nuevo y aceptá todos los pasos.',
    no_profile: 'No encontramos tu perfil. Escribinos.',
    not_configured: 'La integración todavía no está habilitada. Escribinos.',
    error: 'Algo falló al conectar. Probá de nuevo en un rato.',
  };
  const text = messages[code];
  if (!text) return null;
  const isGood = code === 'connected';
  return (
    <p className={`text-xs mt-1 font-medium ${isGood ? 'text-emerald-600' : 'text-amber-600'}`}>
      {text}
    </p>
  );
}
