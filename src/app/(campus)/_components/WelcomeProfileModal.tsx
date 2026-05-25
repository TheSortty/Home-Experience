'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { IoCameraOutline, IoArrowForwardOutline, IoSparklesOutline } from 'react-icons/io5';
import { completeOnboarding, markProfileCompleted } from '../perfil/actions';
import { compressToWebP } from '@/src/utils/imageCompress';

interface Props {
  firstName: string; // may be empty for brand-new users
  showOnLoad: boolean;
}

export default function WelcomeProfileModal({ firstName, showOnLoad }: Props) {
  const [visible, setVisible]       = useState(showOnLoad);
  const [first, setFirst]           = useState(firstName || '');
  const [last, setLast]             = useState('');
  const [preview, setPreview]       = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const nameReady = first.trim().length > 0 && last.trim().length > 0;

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Solo se aceptan imágenes (JPG, PNG, WebP…)');
      return;
    }
    setError(null);
    try {
      const compressed = await compressToWebP(file);
      setPendingFile(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch {
      setError('No se pudo procesar la imagen.');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // "Ahora no" — only skips the photo; name is still required before closing.
  // This button only appears when name fields are filled.
  const handleSkipPhoto = async () => {
    if (!nameReady) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('first_name', first.trim());
    fd.append('last_name',  last.trim());
    await completeOnboarding(fd);
    setSaving(false);
    setVisible(false);
  };

  const handleSave = async () => {
    if (!nameReady) return;
    setSaving(true);
    setError(null);

    const fd = new FormData();
    fd.append('first_name', first.trim());
    fd.append('last_name',  last.trim());
    if (pendingFile) fd.append('file', pendingFile);

    const res = await completeOnboarding(fd);

    setSaving(false);
    if (!res.success) {
      setError(res.error ?? 'Algo salió mal, intentá de nuevo.');
      return;
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

          {/* Top accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#00A9CE] to-teal-400" />

          <div className="p-8 space-y-5">

            {/* Header */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[#00A9CE]">
                <IoSparklesOutline size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Bienvenida al campus</span>
              </div>
              <h2 id="welcome-title" className="font-serif text-3xl font-medium tracking-tight text-slate-900">
                ¡Hola! 👋
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Antes de entrar, contanos quién sos. Tu nombre y foto van a aparecer en el{' '}
                <strong className="text-slate-700">foro de la comunidad</strong>.
              </p>
            </div>

            {/* ── Nombre (required) ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={first}
                  onChange={e => { setFirst(e.target.value); setError(null); }}
                  placeholder="Ana"
                  autoComplete="given-name"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00A9CE] focus:border-transparent text-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={last}
                  onChange={e => { setLast(e.target.value); setError(null); }}
                  placeholder="García"
                  autoComplete="family-name"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00A9CE] focus:border-transparent text-slate-900 text-sm"
                />
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-slate-100" />

            {/* ── Foto (optional, last) ── */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Foto de perfil <span className="font-normal normal-case text-slate-400">(opcional)</span>
              </p>

              <div className="flex items-center gap-5">
                {/* Upload circle */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Subir foto de perfil"
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  className={`relative w-20 h-20 rounded-full border-2 border-dashed shrink-0 transition-all cursor-pointer group
                    ${isDragging
                      ? 'border-[#00A9CE] bg-blue-50 scale-105'
                      : preview
                        ? 'border-transparent'
                        : 'border-slate-300 hover:border-[#00A9CE] hover:bg-slate-50'
                    }`}
                >
                  {preview ? (
                    <>
                      <Image src={preview} alt="Vista previa" fill className="object-cover rounded-full" unoptimized />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        <IoCameraOutline size={22} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400 group-hover:text-[#00A9CE] transition-colors">
                      <IoCameraOutline size={26} />
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-500 leading-relaxed">
                  {preview
                    ? <><span className="font-semibold text-emerald-600">✓ Foto lista</span><br />Clic para cambiarla</>
                    : <>Hacé clic o arrastrá una imagen.<br />Se recorta en círculo automáticamente.</>
                  }
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !nameReady}
                className="w-full flex items-center justify-center gap-2 bg-[#00A9CE] hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm text-sm"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando…
                  </span>
                ) : (
                  <>
                    {pendingFile ? 'Guardar y entrar al campus' : 'Entrar al campus'}
                    <IoArrowForwardOutline size={16} />
                  </>
                )}
              </button>

              {/* Skip photo — only visible once name is filled */}
              {nameReady && !pendingFile && (
                <button
                  onClick={handleSkipPhoto}
                  disabled={saving}
                  className="w-full text-xs text-slate-400 hover:text-slate-600 py-2 transition-colors"
                >
                  Subir foto después
                </button>
              )}

              {/* Hint when name is empty */}
              {!nameReady && (
                <p className="text-center text-xs text-slate-400">
                  Completá tu nombre para continuar
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
