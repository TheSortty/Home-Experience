'use client';

import { useState } from 'react';
import { IoDocumentOutline } from 'react-icons/io5';
import { getAdminSignedUrl } from '../../actions';

export default function DownloadButton({
  storagePath,
  label = 'Ver archivo',
}: {
  storagePath: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const res = await getAdminSignedUrl(storagePath);
    setLoading(false);
    if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-bold text-[#00A9CE] hover:text-blue-700 transition-colors disabled:opacity-50"
    >
      <IoDocumentOutline size={14} />
      {loading ? 'Cargando…' : label}
    </button>
  );
}
