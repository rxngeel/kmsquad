import type { MeshState } from "../meshtastic/connection";
import { isPhoneGpsMode } from "../meshtastic/format";

interface Props {
  state: MeshState;
  active: boolean;
  lastSent: string;
  accuracy?: number;
  gpsError?: string;
  onStart: () => void;
  onStop: () => void;
}

// Painel só mostra o status/botão — quem manda a posição de verdade é o
// hook `usePhonePosition`, que vive em App.tsx (ver comentário lá: precisa
// sobreviver a esse painel sendo desmontado quando o menu fecha).
export function PositionPanel({ state, active, lastSent, accuracy, gpsError, onStart, onStop }: Props) {
  const phoneMode = isPhoneGpsMode(state.positionConfig?.gpsMode);

  if (!phoneMode) {
    return (
      <div className="panel">
        <h2>Posição</h2>
        <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
          Este rádio está com o GPS próprio ligado. Não é preciso enviar a
          posição do celular — deixe o rádio no bolso.
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Posição (GPS do celular)</h2>
      <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
        Este rádio não tem GPS próprio ativo. Mantenha o Bluetooth ligado e o
        celular com você — o envio continua mesmo fechando esse menu, só para
        se você tocar em "Parar" ou fechar o app de vez.
      </p>
      {gpsError && <div className="error-box">{gpsError}</div>}
      {accuracy !== undefined && accuracy > 300 && (
        <div className="error-box">
          O celular está relatando uma precisão de só ±{Math.round(accuracy)} m —
          dá pra errar um bairro inteiro. No iPhone, veja em Ajustes →
          Privacidade e Segurança → Serviços de Localização → Bluefy → se
          "Localização Precisa" está ativada. Se estiver desativada, o
          iOS entrega só uma posição aproximada de propósito.
        </div>
      )}
      <div className="row">
        <span className="label">Último envio</span>
        <span className="value">{lastSent}</span>
      </div>
      <div className="row">
        <span className="label">Precisão do celular</span>
        <span className="value">{accuracy !== undefined ? `±${Math.round(accuracy)} m` : "—"}</span>
      </div>
      <div style={{ marginTop: 12 }}>
        <button className={active ? "secondary" : "primary"} onClick={active ? onStop : onStart}>
          {active ? "Parar envio de posição" : "Começar a enviar minha posição"}
        </button>
      </div>
    </div>
  );
}
