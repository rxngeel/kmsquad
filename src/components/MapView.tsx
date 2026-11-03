import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MeshState } from "../meshtastic/connection";
import { isPositionStale, labelFor } from "../meshtastic/format";

// Airsoft Company (Curitiba) é o campo de referência pra teste — provisório
// até o Ran mandar a localização exata. Troca pra fase de mapa offline.
const DEFAULT_CENTER: [number, number] = [-25.4284, -49.2733];

interface Props {
  state: MeshState;
}

export function MapView({ state }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<number, L.Marker>());
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView(DEFAULT_CENTER, 16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      hasCenteredRef.current = false;
    };
  }, []);

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

      const icon = L.divIcon({
        className: [
          "map-marker",
          isSelf && "map-marker--self",
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
  }, [state.nodes, state.myNodeNum]);

  return <div ref={containerRef} className="map-view" />;
}
