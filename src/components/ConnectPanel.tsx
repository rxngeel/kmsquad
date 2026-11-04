import type { MeshState } from "../meshtastic/connection";

interface Props {
  state: MeshState;
  onConnect: () => void;
}

const CONNECT_MESSAGE: Record<MeshState["status"], string> = {
  desconectado: "Toque no botão abaixo pra conectar com o rádio.",
  conectando: "Procurando o rádio pelo Bluetooth…",
  configurando: "Lendo a configuração do rádio…",
  configurado: "Conectado!",
  erro: "Não consegui conectar.",
};

export function ConnectPanel({ state, onConnect }: Props) {
  const busy = state.status === "conectando" || state.status === "configurando";

  return (
    <div className="connect-card">
      <div className={`connect-radar ${busy ? "connect-radar--active" : ""}`}>
        <div className="connect-radar-ring connect-radar-ring--outer" />
        <div className="connect-radar-ring connect-radar-ring--inner" />
        <div className="connect-radar-core">
          <span>K</span>
        </div>
      </div>

      <p className="connect-status">{CONNECT_MESSAGE[state.status]}</p>
      {state.deviceName && <p className="connect-device">{state.deviceName}</p>}
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
