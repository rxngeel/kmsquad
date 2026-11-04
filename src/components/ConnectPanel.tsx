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
    <div className="panel connect-card">
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
      <button className="primary connect-btn" onClick={onConnect} disabled={busy}>
        {busy ? "Conectando…" : state.status === "configurado" ? "Reconectar rádio" : "Conectar rádio"}
      </button>
      <p className="connect-hint">
        Dica: se o rádio não aparecer na lista de dispositivos Bluetooth, é
        porque ele ainda "acha" que está conectado de uma vez anterior —
        desligue e ligue o rádio e tente de novo.
      </p>
    </div>
  );
}
