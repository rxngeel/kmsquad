// Matemática de tile XYZ (slippy map) + download em lote pra cache offline.
// O cache em si (CacheFirst) é configurado no vite.config.ts (workbox
// runtimeCaching) — aqui só disparamos os fetch() que o service worker
// intercepta e guarda, pra que fiquem disponíveis offline depois.

const SUBDOMAINS = ["a", "b", "c"];

function lon2tileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

function lat2tileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
}

export interface TileDownloadArea {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Só a camada Relevo (OpenTopoMap) — ver docs/decisoes.md sobre a licença da Esri. */
export const OFFLINE_ZOOMS = [13, 14, 15, 16, 17];
export const OFFLINE_TILE_CAP = 2500;

/** Conta quantos tiles a área vai precisar em cada nível de zoom, sem baixar nada. */
export function countTiles(area: TileDownloadArea, zooms: number[]): number {
  let total = 0;
  for (const z of zooms) {
    const xMin = lon2tileX(area.west, z);
    const xMax = lon2tileX(area.east, z);
    const yMin = lat2tileY(area.north, z);
    const yMax = lat2tileY(area.south, z);
    total += (xMax - xMin + 1) * (yMax - yMin + 1);
  }
  return total;
}

function buildTileUrls(area: TileDownloadArea, zooms: number[]): string[] {
  const urls: string[] = [];
  let i = 0;
  for (const z of zooms) {
    const xMin = lon2tileX(area.west, z);
    const xMax = lon2tileX(area.east, z);
    const yMin = lat2tileY(area.north, z);
    const yMax = lat2tileY(area.south, z);
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const s = SUBDOMAINS[i % SUBDOMAINS.length];
        urls.push(`https://${s}.tile.opentopomap.org/${z}/${x}/${y}.png`);
        i++;
      }
    }
  }
  return urls;
}

/**
 * Baixa os tiles da área (camada Relevo). Cada fetch() é interceptado pelo
 * service worker (runtimeCaching do workbox, CacheFirst) — é isso que deixa
 * os tiles disponíveis offline depois, não precisamos guardar nada aqui.
 * `mode: "no-cors"` porque o servidor de tile não manda cabeçalho CORS (é
 * pensado pra `<img>`, não `fetch`) — a resposta vem "opaca" (não
 * conseguimos ler o conteúdo), mas o Workbox ainda guarda ela no cache.
 */
export async function downloadTiles(
  area: TileDownloadArea,
  zooms: number[],
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
  concurrency = 6,
): Promise<{ done: number; total: number; cancelled: boolean }> {
  const urls = buildTileUrls(area, zooms);
  const total = urls.length;
  let done = 0;
  let cancelled = false;
  let next = 0;

  async function worker() {
    while (next < urls.length) {
      if (isCancelled()) {
        cancelled = true;
        return;
      }
      const url = urls[next++];
      try {
        await fetch(url, { mode: "no-cors" });
      } catch {
        // tile individual falhou (rede instável em campo) — segue pros outros, não é fatal
      }
      done++;
      onProgress(done, total);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(urls.length, 1)) }, () => worker()));
  return { done, total, cancelled };
}
