import { getCloudflareContext } from '@opennextjs/cloudflare';
import { requireSysadminPage } from '@home/services/adminPageGuard';
import ConfiguracionClient from './ConfiguracionClient';

// Plan gratis de R2: 10 GB en total, sumando todos los buckets de la cuenta.
const FREE_TIER_BYTES = 10 * 1024 ** 3;

// ponytail: recorre el bucket entero en cada visita (1 subrequest cada 1000
// archivos). Alcanza para miles de archivos; si crece mucho, cachearlo.
async function bucketBytes(bucket: R2Bucket): Promise<number> {
  let total = 0;
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ cursor, limit: 1000 });
    for (const o of page.objects) total += o.size;
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return total;
}

async function getStorageUsage() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const { ENTREGAS, AVATARS } = env as unknown as { ENTREGAS: R2Bucket; AVATARS: R2Bucket };
    const [entregas, imagenes] = await Promise.all([bucketBytes(ENTREGAS), bucketBytes(AVATARS)]);
    return { entregas, imagenes };
  } catch (err) {
    console.error('[R2] no se pudo medir el almacenamiento:', err);
    return null;
  }
}

const fmt = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;

export default async function ConfiguracionPage() {
  await requireSysadminPage();
  const usage = await getStorageUsage();
  const used = usage ? usage.entregas + usage.imagenes : 0;
  const pct = Math.min(100, (used / FREE_TIER_BYTES) * 100);

  return (
    <>
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Almacenamiento de archivos</h3>
        {usage ? (
          <>
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-bold">{fmt(used)}</span> usados de {fmt(FREE_TIER_BYTES)} gratis ({pct.toFixed(1)}%)
            </p>
            <progress
              value={used}
              max={FREE_TIER_BYTES}
              className="mt-3 h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-[#00A9CE] [&::-moz-progress-bar]:bg-[#00A9CE]"
            />
            <p className="mt-2 text-xs text-slate-400">
              Entregas y materiales: {fmt(usage.entregas)} · Fotos de perfil y portadas: {fmt(usage.imagenes)}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No se pudo consultar el almacenamiento en este momento.</p>
        )}
      </section>
      <ConfiguracionClient />
    </>
  );
}
