import type { MeshState } from "../meshtastic/connection";

interface Props {
  state: MeshState;
  onClose: () => void;
  disconnect: () => Promise<void>;
}

export function DebugScreen({ state, onClose, disconnect }: Props) {
  return (
    <div className="panel">
      <h2>Tela de debug</h2>
      <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
        Se algo der errado, manda um print desta tela pro Ran analisar.
      </p>
      {state.status !== "desconectado" && (
        <div className="error-box" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
          Se o rádio não estiver aparecendo na lista pra conectar (já
          conectado antes, de outra vez que abriu o app), toque em
          "Desconectar rádio" abaixo e tente de novo — isso libera a conexão
          Bluetooth de verdade. Se mesmo assim não aparecer, desligue e
          ligue o rádio.
          <div style={{ marginTop: 10 }}>
            <button className="secondary" onClick={disconnect}>
              Desconectar rádio
            </button>
          </div>
        </div>
      )}
      <div className="row">
        <span className="label">Status</span>
        <span className="value">{state.status}</span>
      </div>
      <div className="row">
        <span className="label">Meu nó</span>
        <span className="value">{state.myNodeNum ?? "—"}</span>
      </div>
      <div className="row">
        <span className="label">Nós no cache</span>
        <span className="value">{state.nodes.size}</span>
      </div>
      <div className="row">
        <span className="label">Canais recebidos</span>
        <span className="value">{state.channels.size}</span>
      </div>
      <h3 style={{ marginTop: 14 }}>Log de eventos (mais recente primeiro)</h3>
      <div className="debug-log">{state.debugLog.join("\n") || "(vazio)"}</div>
      <div style={{ marginTop: 12 }}>
        <button className="secondary" onClick={onClose}>
          Fechar debug
        </button>
      </div>
    </div>
  );
}
