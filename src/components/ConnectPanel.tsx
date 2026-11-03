import type { MeshState } from "../meshtastic/connection";

interface Props {
  state: MeshState;
  onConnect: () => void;
}

const STATUS_BADGE: Record<MeshState["status"], { label: string; cls: string }> = {
  desconectado: { label: "DESCONECTADO", cls: "neutral" },
  conectando: { label: "CONECTANDO…", cls: "warn" },
  configurando: { label: "LENDO CONFIG…", cls: "warn" },
  configurado: { label: "CONECTADO", cls: "ok" },
  erro: { label: "ERRO", cls: "danger" },
};

export function ConnectPanel({ state, onConnect }: Props) {
  const badge = STATUS_BADGE[state.status];
  const busy = state.status === "conectando" || state.status === "configurando";

  return (
    <div className="panel">
      <div className="row">
        <span className="label">Rádio</span>
        <span className={`badge ${badge.cls}`}>{badge.label}</span>
      </div>
      {state.deviceName && (
        <div className="row">
          <span className="label">Dispositivo</span>
          <span className="value">{state.deviceName}</span>
        </div>
      )}
      {state.errorMessage && <div className="error-box">{state.errorMessage}</div>}
      <div style={{ marginTop: 12 }}>
        <button className="primary" onClick={onConnect} disabled={busy}>
          {state.status === "configurado" ? "Reconectar rádio" : "Conectar rádio"}
        </button>
      </div>
    </div>
  );
}
