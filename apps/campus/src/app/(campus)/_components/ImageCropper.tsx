'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { IoCheckmarkOutline, IoArrowBackOutline } from 'react-icons/io5';

interface Props {
  file: File;
  /** Diameter of the crop circle displayed on screen (px). Default 220. */
  displaySize?: number;
  /** Output WebP size (px). Default 400. */
  outputPx?: number;
  /** WebP quality 0–1. Default 0.82. */
  quality?: number;
  onConfirm: (croppedFile: File) => void;
  onCancel: () => void;
}

export default function ImageCropper({
  file,
  displaySize = 220,
  outputPx = 400,
  quality = 0.82,
  onConfirm,
  onCancel,
}: Props) {
  const [imgSrc, setImgSrc]       = useState<string | null>(null);
  const [displayW, setDisplayW]   = useState(0);
  const [displayH, setDisplayH]   = useState(0);
  const [scale, setScale]         = useState(1);
  const [offsetX, setOffsetX]     = useState(0);
  const [offsetY, setOffsetY]     = useState(0);
  const [dragging, setDragging]   = useState(false);
  const imgRef                    = useRef<HTMLImageElement>(null);
  const lastPos                   = useRef({ x: 0, y: 0 });

  /* ── Load image ── */
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /* ── Compute cover-scale once image loads ── */
  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const s   = Math.max(displaySize / img.naturalWidth, displaySize / img.naturalHeight);
    const dw  = img.naturalWidth  * s;
    const dh  = img.naturalHeight * s;
    setScale(s);
    setDisplayW(dw);
    setDisplayH(dh);
    setOffsetX(0);
    setOffsetY(0);
  };

  const maxDX = Math.max((displayW - displaySize) / 2, 0);
  const maxDY = Math.max((displayH - displaySize) / 2, 0);
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

  /* ── Mouse ── */
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffsetX(p => clamp(p + dx, -maxDX, maxDX));
    setOffsetY(p => clamp(p + dy, -maxDY, maxDY));
  }, [dragging, maxDX, maxDY]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  /* ── Touch ── */
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging(true);
    lastPos.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - lastPos.current.x;
    const dy = t.clientY - lastPos.current.y;
    lastPos.current = { x: t.clientX, y: t.clientY };
    setOffsetX(p => clamp(p + dx, -maxDX, maxDX));
    setOffsetY(p => clamp(p + dy, -maxDY, maxDY));
  }, [dragging, maxDX, maxDY]);

  const onTouchEnd = useCallback(() => setDragging(false), []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',  onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend',  onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',  onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend',  onTouchEnd);
    };
  }, [onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  /* ── Confirm: crop via Canvas ── */
  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !scale) return;

    // The visible region in source-image coordinates
    const srcX    = ((displayW - displaySize) / 2 - offsetX) / scale;
    const srcY    = ((displayH - displaySize) / 2 - offsetY) / scale;
    const srcSize = displaySize / scale;

    const canvas  = document.createElement('canvas');
    canvas.width  = outputPx;
    canvas.height = outputPx;
    const ctx     = canvas.getContext('2d')!;
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, outputPx, outputPx);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onConfirm(new File([blob], 'avatar.webp', { type: 'image/webp' }));
      },
      'image/webp',
      quality,
    );
  };

  return (
    <div className="flex flex-col items-center gap-3 select-none">

      {/* Crop circle */}
      <div
        style={{
          width:        displaySize,
          height:       displaySize,
          borderRadius: '50%',
          overflow:     'hidden',
          position:     'relative',
          background:   '#e2e8f0',
          boxShadow:    '0 0 0 3px #00A9CE, 0 0 0 6px #e0f5fb',
          cursor:       dragging ? 'grabbing' : 'grab',
          flexShrink:   0,
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {imgSrc && (
          <div
            style={{
              width:     '100%',
              height:    '100%',
              display:   'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imgSrc}
              alt="Ajustá el encuadre"
              onLoad={handleLoad}
              draggable={false}
              style={{
                width:          displayW || 'auto',
                height:         displayH || 'auto',
                transform:      `translate(${offsetX}px, ${offsetY}px)`,
                pointerEvents:  'none',
                flexShrink:     0,
              }}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center leading-relaxed">
        Arrastrá para elegir el encuadre
      </p>

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          className="flex items-center gap-1.5 bg-[#00A9CE] hover:bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          <IoCheckmarkOutline size={16} /> Confirmar
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <IoArrowBackOutline size={14} /> Elegir otra
        </button>
      </div>
    </div>
  );
}
