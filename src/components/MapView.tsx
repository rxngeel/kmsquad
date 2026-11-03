import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MeshState } from "../meshtastic/connection";
import { isPositionStale, labelFor } from "../meshtastic/format";
import { PlayerStatus } from "../meshtastic/protocol";

// Airsoft Company (Curitiba) é o campo de referência pra teste — provisório
// até o Ran mandar a localização exata. Troca pra fase de mapa offline.
const DEFAULT_CENTER: [number, number] = [-25.4284, -49.2733];

type BaseLayerId = "relevo" | "satelite" | "rua";

// Relevo (OpenTopoMap) mostra vegetação (verde = mata) e curvas de nível —
// bom pra diferenciar mata/aberto/elevação, e a licença (CC-BY-SA, dados
// OSM+SRTM) permite cache offline mais tranquilo que imagem de satélite.
// Satélite (Esri) é a visão mais literal do terreno, mas a licença da Esri
// não deixa claro que dá pra cachear os tiles pra uso offline em massa —
// por enquanto só pra visualização online; reavaliar na fase de mapa offline.
// maxZoom > maxNativeZoom deixa o Leaflet "esticar" o último tile disponível
// (fica um pouco granulado, mas dá pra aproximar mais que o provedor
// realmente tem — pedido do Ran pra conseguir ver prédio por prédio).
const BASE_LAYERS: Record<BaseLayerId, { label: string; url: string; options: L.TileLayerOptions }> = {
  relevo: {
    label: "Relevo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    options: {
      maxNativeZoom: 17,
      maxZoom: 21,
      attribution: "© OpenTopoMap (CC-BY-SA) · dados © OpenStreetMap, SRTM",
    },
  },
  satelite: {
    label: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: {
      maxNativeZoom: 19,
      maxZoom: 21,
      attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
    },
  },
  rua: {
    label: "Rua",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { maxNativeZoom: 19, maxZoom: 21, attribution: "© OpenStreetMap" },
  },
};

interface Props {
  state: MeshState;
}

export function MapView({ state }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<number, L.Marker>());
  const hasCenteredRef = useRef(false);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const [baseLayerId, setBaseLayerId] = useState<BaseLayerId>("relevo");

  useEffect(() => {
    if (!containerRef.current) return;
    // zoomControl no canto inferior esquerdo: o canto superior fica ocupado
    // pela barra do HUD (status da conexão, relógio, menu).
    const map = L.map(containerRef.current, { zoomControl: false, maxZoom: 21 }).setView(DEFAULT_CENTER, 16);
    L.control.zoom({ position: "bottomleft" }).addTo(map);

    // Atribuição é exigência de licença dos provedores de tile (OSM/OpenTopoMap/
    // Esri), não dá pra tirar — mas tira o "Leaflet" (não é obrigatório) e
    // move pro canto inferior esquerdo, longe do botão de status no canto
    // inferior direito.
    map.attributionControl.setPrefix(false);
    map.attributionControl.setPosition("bottomleft");

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
      markersRef.current.clear();
      hasCenteredRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const def = BASE_LAYERS[baseLayerId];
    const layer = L.tileLayer(def.url, def.options);
    layer.addTo(map);
    const previous = baseLayerRef.current;
    baseLayerRef.current = layer;
    if (previous) previous.remove();
  }, [baseLayerId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<number>();

    for (const node of state.nodes.values()) {
      const pos = node.position;
      if (!pos?.latitudeI || !pos?.longitudeI) continue;
      seen.add(node.num);

      const lat = pos.latitudeI / 1e7;
      const lon = pos.longitudeI / 1e7;
      const isSelf = node.num === state.myNodeNum;
      const stale = isPositionStale(pos.time);
      const label = labelFor(node);
      const status = state.playerStatus.get(node.num);

      const icon = L.divIcon({
        className: [
          "map-marker",
          isSelf && "map-marker--self",
          status === PlayerStatus.SANGRANDO && "map-marker--sangrando",
          status === PlayerStatus.MORTO && "map-marker--morto",
          stale && "map-marker--stale",
        ]
          .filter(Boolean)
          .join(" "),
        html: `<span>${label}</span>`,
        iconSize: [44, 44],
      });

      const existing = markersRef.current.get(node.num);
      if (existing) {
        existing.setLatLng([lat, lon]);
        existing.setIcon(icon);
      } else {
        const marker = L.marker([lat, lon], { icon }).addTo(map);
        markersRef.current.set(node.num, marker);
      }

      if (isSelf && !hasCenteredRef.current) {
        map.setView([lat, lon], map.getZoom());
        hasCenteredRef.current = true;
      }
    }

    for (const [num, marker] of markersRef.current) {
      if (!seen.has(num)) {
        marker.remove();
        markersRef.current.delete(num);
      }
    }
  }, [state.nodes, state.myNodeNum, state.playerStatus]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-view" />
      <div className="map-layer-switch">
        {(Object.keys(BASE_LAYERS) as BaseLayerId[]).map((id) => (
          <button
            key={id}
            type="button"
            className={id === baseLayerId ? "active" : ""}
            onClick={() => setBaseLayerId(id)}
          >
            {BASE_LAYERS[id].label}
          </button>
        ))}
      </div>
    </div>
  );
}
