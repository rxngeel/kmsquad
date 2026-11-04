import { useRef, useState } from "react";
import type L from "leaflet";
import { OFFLINE_TILE_CAP, OFFLINE_ZOOMS, countTiles, downloadTiles } from "../offline/tiles";

interface Props {
  map: L.Map | null;
  hasFieldImage: boolean;
  onPickFieldImage: (file: File) => void;
  onClearFieldImage: () => void;
}

type DownloadStatus =
  | { phase: "ocioso" }
  | { phase: "baixando"; done: number; total: number }
  | { phase: "pronto"; total: number }
  | { phase: "erro"; message: string };

/**
 * Preparo pra ir pro campo sem sinal: baixar os tiles da área visível (só
 * camada Relevo — Satélite/Esri não tem licença clara pra cache em lote,
 * ver docs/decisoes.md) e importar uma foto do campo como camada.
 */
export function OfflineMapPanel({ map, hasFieldImage, onPickFieldImage, onClearFieldImage }: Props) {
  const [status, setStatus] = useState<DownloadStatus>({ phase: "ocioso" });
  const cancelledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDownload() {
    if (!map) return;
    const b = map.getBounds();
    const area = { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() };
    const total = countTiles(area, OFFLINE_ZOOMS);
    if (total > OFFLINE_TILE_CAP) {
      setStatus({
        phase: "erro",
        message: `Área grande demais pra baixar (${total} tiles). Dê mais zoom pra reduzir a área visível e tente de novo.`,
      });
      return;
    }
    cancelledRef.current = false;
    setStatus({ phase: "baixando", done: 0, total });
    const result = await downloadTiles(
      area,
      OFFLINE_ZOOMS,
      (done, t) => setStatus({ phase: "baixando", done, total: t }),
      () => cancelledRef.current,
    );
    setStatus(result.cancelled ? { phase: "ocioso" } : { phase: "pronto", total: result.total });
  }

  return (
    <div>
      <div className="panel">
        <h2>Tiles do mapa (Relevo)</h2>
        <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
          Arraste e dê zoom no mapa até enquadrar a área do campo, depois toque em baixar — essa tela fecha
          sozinha pra você posicionar o mapa antes. Só a camada Relevo é baixada; é a única com licença clara
          pra guardar offline.
        </p>

        {status.phase === "ocioso" && (
          <button type="button" className="primary" onClick={handleDownload} disabled={!map}>
            Baixar área visível
          </button>
        )}

        {status.phase === "baixando" && (
          <>
            <div className="offline-progress">
              <div
                className="offline-progress-bar"
                style={{ width: `${status.total ? (status.done / status.total) * 100 : 0}%` }}
              />
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
              {status.done} / {status.total} tiles
            </p>
            <button type="button" className="secondary" onClick={() => (cancelledRef.current = true)}>
              Cancelar
            </button>
          </>
        )}

        {status.phase === "pronto" && (
          <>
            <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
              Pronto! {status.total} tiles baixados dessa área.
            </p>
            <button type="button" className="secondary" onClick={() => setStatus({ phase: "ocioso" })}>
              Baixar outra área
            </button>
          </>
        )}

        {status.phase === "erro" && (
          <>
            <div className="error-box">{status.message}</div>
            <button type="button" className="secondary" onClick={() => setStatus({ phase: "ocioso" })}>
              Entendi
            </button>
          </>
        )}
      </div>

      <div className="panel">
        <h2>Foto do campo</h2>
        <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
          Importa uma foto (drone, satélite) e posiciona ela sobre o mapa tocando em 2 cantos opostos. Fica
          salva no celular e funciona offline.
        </p>

        {hasFieldImage ? (
          <button type="button" className="secondary" onClick={onClearFieldImage}>
            Remover camada de imagem
          </button>
        ) : (
          <>
            <button type="button" className="secondary" onClick={() => fileInputRef.current?.click()}>
              Escolher imagem
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPickFieldImage(file);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
