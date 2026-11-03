import type { MeshState } from "../meshtastic/connection";
import { formatAge, formatLatLon, isPositionStale } from "../meshtastic/format";

interface Props {
  state: MeshState;
}

export function NodeListPanel({ state }: Props) {
  const nodes = Array.from(state.nodes.values()).filter(
    (n) => n.num !== state.myNodeNum,
  );

  return (
    <div className="panel">
      <h2>Nós vistos ({nodes.length})</h2>
      {nodes.length === 0 && (
        <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
          Nenhum outro nó visto ainda. Ligue o outro rádio perto e aguarde.
        </p>
      )}
      {nodes.map((node) => {
        const stale = isPositionStale(node.position?.time);
        return (
          <div key={node.num} className="node-card">
            <div className="name">
              {node.user?.longName ?? `Nó #${node.num}`}
              {node.user?.shortName ? ` (${node.user.shortName})` : ""}
            </div>
            <div className="meta">
              {formatLatLon(node.position?.latitudeI, node.position?.longitudeI)}
            </div>
            <div className="meta" style={{ opacity: stale ? 0.5 : 1 }}>
              posição {formatAge(node.position?.time)} · ouvido {formatAge(node.lastHeard)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
