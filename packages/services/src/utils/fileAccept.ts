'use client';

import { useEffect, useState } from 'react';
import { FILE_ACCEPT, isAllowedFile } from '../entregasFileTypes';

export { FILE_ACCEPT, isAllowedFile };

/** Mensaje de error cuando el archivo elegido no es de un formato permitido. */
export function rejectedFilesMessage(files: File[]): string {
  const names = files.map(f => `"${f.name}"`).join(', ');
  return files.length === 1
    ? `${names} no es un formato permitido. Aceptamos PDF, Word, Excel, PowerPoint, texto e imágenes.`
    : `${names} no son formatos permitidos. Aceptamos PDF, Word, Excel, PowerPoint, texto e imágenes.`;
}

/**
 * En celulares y tablets el atributo `accept` rompe el selector de archivos:
 * Chrome/Android traduce la lista a un intent con MIME exactos y los proveedores
 * que no los declaran (Drive, Descargas, WhatsApp, gestores de archivos) quedan
 * fuera del menú — el alumno ve sólo "Cámara/Galería" y no llega nunca a su
 * .docx. iOS/Safari tiene el mismo problema con las extensiones que no puede
 * mapear a un UTI: abre "Explorar" con todo en gris.
 *
 * Solución: filtrar sólo en escritorio, y validar por extensión en JS (acá) y
 * en el servidor (isAllowedFile) en todos los dispositivos.
 */
export function useFileAccept(): string | undefined {
  const [accept, setAccept] = useState<string | undefined>(FILE_ACCEPT);

  useEffect(() => {
    if (window.matchMedia?.('(pointer: coarse)').matches) setAccept(undefined);
  }, []);

  return accept;
}
