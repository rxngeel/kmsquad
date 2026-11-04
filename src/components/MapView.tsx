import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker, MeshState } from "../meshtastic/connection";
import { isPositionStale, labelFor } from "../meshtastic/format";
import { MarkerType, type MarkerTypeValue } from "../meshtastic/protocol";

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

const MARKER_OPTIONS: Array<{ type: MarkerTypeValue; label: string; symbol: string; cls: string }> = [
  { type: MarkerType.CONTATO, label: "Contato", symbol: "!", cls: "contato" },
  { type: MarkerType.OBJETIVO, label: "Objetivo", symbol: "★", cls: "objetivo" },
  { type: MarkerType.PONTO_DE_ENCONTRO, label: "Ponto de encontro", symbol: "P", cls: "encontro" },
  { type: MarkerType.PERIGO, label: "Perigo", symbol: "⚠", cls: "perigo" },
];

function markerVisual(type: MarkerTypeValue) {
  return MARKER_OPTIONS.find((o) => o.type === type) ?? MARKER_OPTIONS[0];
}

interface Props {
  state: MeshState;
  sendMarker: (type: MarkerTypeValue, latitudeI: number, longitudeI: number) => Promise<void>;
  removeMarker: (id: number) => Promise<void>;
}

export function MapView({ state, sendMarker, removeMarker }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<number, L.Marker>());
  const pinsRef = useRef(new Map<string, L.Marker>());
  const hasCenteredRef = useRef(false);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  // Satélite é a visão que mostra o terreno de verdade (prédios, trilhas) —
  // pedido do Ran pra abrir já nela, em vez do Relevo (que é melhor pra
  // mata/elevação, mas menos reconhecível de cara).
  const [baseLayerId, setBaseLayerId] = useState<BaseLayerId>("satelite");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [placingType, setPlacingType] = useState<MarkerTypeValue | null>(null);
  const [selectedMarkerKey, setSelectedMarkerKey] = useState<string | null>(null);
  const placingTypeRef = useRef<MarkerTypeValue | null>(null);
  placingTypeRef.current = placingType;
  const sendMarkerRef = useRef(sendMarker);
  sendMarkerRef.current = sendMarker;
  const recenterRef = useRef<() => void>(() => {});
  recenterRef.current = () => {
    const map = mapRef.current;
    const pos = state.myNodeNum !== undefined ? state.nodes.get(state.myNodeNum)?.position : undefined;
    if (!map || !pos?.latitudeI || !pos?.longitudeI) return;
    map.setView([pos.latitudeI / 1e7, pos.longitudeI / 1e7], map.getZoom());
  };

  useEffect(() => {
    if (!containerRef.current) return;
    // zoomControl no canto inferior esquerdo: o canto superior fica ocupado
    // pela barra do HUD (status da conexão, relógio, menu).
    const map = L.map(containerRef.current, { zoomControl: false, maxZoom: 21 }).setView(DEFAULT_CENTER, 16);

    // Botão de centralizar na própria posição — fica acima do +/- de zoom
    // (mesmo canto), estilo "locate" do ATAK.
    const LocateControl = L.Control.extend({
      options: { position: "bottomleft" as const },
      onAdd() {
        const container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        const link = L.DomUtil.create("a", "map-locate-btn", container);
        link.href = "#";
        link.title = "Centralizar na minha posição";
        link.setAttribute("aria-label", "Centralizar na minha posição");
        link.setAttribute("role", "button");
        link.innerHTML = "◎";
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(link, "click", (e: Event) => {
          L.DomEvent.preventDefault(e);
          recenterRef.current();
        });
        return container;
      },
    });
    new LocateControl().addTo(map);

    L.control.zoom({ position: "bottomleft" }).addTo(map);

    // Atribuição é exigência de licença dos provedores de tile (OSM/OpenTopoMap/
    // Esri), não dá pra tirar — mas tira o "Leaflet" (não é obrigatório) e
    // move pro canto inferior esquerdo, longe do botão de status no canto
    // inferior direito.
    map.attributionControl.setPrefix(false);
    map.attributionControl.setPosition("bottomleft");

    // Toque segurando não é confiável em navegador mobile (o sistema
    // disputa com o JS e às vezes vence selecionando texto/imagem) — fluxo
    // é só de toques: botão "+" abre o menu de tipo, depois um toque no
    // mapa marca o ponto. `click` normal, sem ambiguidade de gesto.
    map.on("click", (e: L.LeafletMouseEvent) => {
      const type = placingTypeRef.current;
      if (type === null) return;
      setPlacingType(null);
      const latitudeI = Math.round(e.latlng.lat * 1e7);
      const longitudeI = Math.round(e.latlng.lng * 1e7);
      sendMarkerRef.current(type, latitudeI, longitudeI);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
      markersRef.current.clear();
      pinsRef.current.clear();
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
      const heading = state.headings.get(node.num);

      const arrowHtml =
        heading !== undefined
          ? `<div class="map-marker-arrow-wrap" style="transform: rotate(${heading}deg)"><div class="map-marker-arrow"></div></div>`
          : "";

      const icon = L.divIcon({
        className: [
          "map-marker",
          isSelf && "map-marker--self",
          stale && "map-marker--stale",
        ]
          .filter(Boolean)
          .join(" "),
        html: `${arrowHtml}<span>${label}</span>`,
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
  }, [state.nodes, state.myNodeNum, state.headings]);

  // Marcadores (CONTATO/OBJETIVO/PONTO DE ENCONTRO/PERIGO) criados por
  // qualquer um do squad — camada separada dos jogadores.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();

    for (const [key, marker] of state.markers as Map<string, MapMarker>) {
      seen.add(key);
      const visual = markerVisual(marker.type);
      const lat = marker.latitudeI / 1e7;
      const lon = marker.longitudeI / 1e7;

      const icon = L.divIcon({
        className: `map-pin map-pin--${visual.cls}`,
        html: `<span>${visual.symbol}</span>`,
        iconSize: [32, 32],
      });

      const existing = pinsRef.current.get(key);
      if (existing) {
        existing.setLatLng([lat, lon]);
        existing.setIcon(icon);
      } else {
        const leafletMarker = L.marker([lat, lon], { icon, title: visual.label }).addTo(map);
        leafletMarker.on("click", () => setSelectedMarkerKey(key));
        pinsRef.current.set(key, leafletMarker);
      }
    }

    for (const [key, marker] of pinsRef.current) {
      if (!seen.has(key)) {
        marker.remove();
        pinsRef.current.delete(key);
      }
    }
  }, [state.markers]);

  function handlePickType(type: MarkerTypeValue) {
    setPickerOpen(false);
    setPlacingType(type);
  }

  async function handleRemoveSelected() {
    if (!selectedMarkerKey) return;
    const marker = state.markers.get(selectedMarkerKey);
    setSelectedMarkerKey(null);
    if (marker) await removeMarker(marker.id);
  }

  const placingVisual = placingType !== null ? markerVisual(placingType) : null;
  const selectedMarker = selectedMarkerKey ? state.markers.get(selectedMarkerKey) : undefined;
  const selectedVisual = selectedMarker ? markerVisual(selectedMarker.type) : null;
  const isOwnSelectedMarker = selectedMarker?.authorNodeNum === state.myNodeNum;

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

      {!pickerOpen && !placingType && (
        <button type="button" className="marker-fab" onClick={() => setPickerOpen(true)} aria-label="Marcar no mapa">
          +
        </button>
      )}

      {placingVisual && (
        <div className="marker-placing-hint">
          <span>
            Toque no mapa pra marcar <strong>{placingVisual.label.toUpperCase()}</strong>
          </span>
          <button type="button" className="secondary" onClick={() => setPlacingType(null)}>
            Cancelar
          </button>
        </div>
      )}

      {selectedMarker && selectedVisual && (
        <div className="marker-placing-hint">
          <span>
            <strong>{selectedVisual.label.toUpperCase()}</strong>
            {!isOwnSelectedMarker && " · de outro jogador"}
          </span>
          {isOwnSelectedMarker && (
            <button type="button" className="marker-remove-btn" onClick={handleRemoveSelected}>
              Remover
            </button>
          )}
          <button type="button" className="secondary" onClick={() => setSelectedMarkerKey(null)}>
            Fechar
          </button>
        </div>
      )}

      {pickerOpen && (
        <>
          <div className="marker-picker-backdrop" onClick={() => setPickerOpen(false)} />
          <div className="marker-picker">
            {MARKER_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                className={`marker-picker-btn marker-picker-btn--${opt.cls}`}
                onClick={() => handlePickType(opt.type)}
              >
                <span className="marker-picker-symbol">{opt.symbol}</span>
                {opt.label}
              </button>
            ))}
            <button type="button" className="secondary" onClick={() => setPickerOpen(false)}>
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
