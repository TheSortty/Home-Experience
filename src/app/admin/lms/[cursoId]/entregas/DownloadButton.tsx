'use client';

import { IoDocumentOutline } from 'react-icons/io5';
import { entregaDownloadHref } from '@/src/services/entregaDownload';

export default function DownloadButton({
  storagePath,
  label = 'Ver archivo',
}: {
  storagePath: string;
  label?: string;
}) {
  return (
    <a
      href={entregaDownloadHref(storagePath)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-xs font-bold text-[#00A9CE] hover:text-blue-700 transition-colors"
    >
      <IoDocumentOutline size={14} />
      {label}
    </a>
  );
}
