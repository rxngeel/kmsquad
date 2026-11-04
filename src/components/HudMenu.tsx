import type { MeshState } from "../meshtastic/connection";
import type { Protobuf } from "@meshtastic/core";
import { IdentityPanel } from "./IdentityPanel";
import { RadioPanel } from "./RadioPanel";
import { SquadPanel } from "./SquadPanel";
import { NodeListPanel } from "./NodeListPanel";
import { PositionPanel } from "./PositionPanel";
import { TestMessagePanel } from "./TestMessagePanel";

interface Props {
  state: MeshState;
  onClose: () => void;
  onOpenDebug: () => void;
  createSquad: (name: string) => Promise<string>;
  joinSquad: (url: string) => Promise<string>;
  setLoraSettings: (patch: {
    region?: Protobuf.Config.Config_LoRaConfig_RegionCode;
    modemPreset?: Protobuf.Config.Config_LoRaConfig_ModemPreset;
  }) => Promise<void>;
  setPositionSettings: (patch: {
    positionBroadcastSecs?: number;
    broadcastSmartMinimumDistance?: number;
    broadcastSmartMinimumIntervalSecs?: number;
  }) => Promise<void>;
  sendPhonePosition: (lat: number, lon: number, alt?: number) => Promise<void>;
  sendTestMessage: (text: string) => Promise<void>;
  setIdentity: (longName: string, shortName: string) => Promise<void>;
}

/**
 * Menu lateral do HUD. Ordem pensada pra quem abre o app por 1ª vez: nome →
 * rádio (região/preset/intervalo) → squad — assim quando o squad é criado,
 * o link já leva a região certa pra quem entrar (ver docs/decisoes.md). O
 * resto (nós vistos, posição manual, mensagem de teste) é status/depuração,
 * não faz parte do "primeiro uso", por isso fica depois de uma divisória.
 */
export function HudMenu({
  state,
  onClose,
  onOpenDebug,
  createSquad,
  joinSquad,
  setLoraSettings,
  setPositionSettings,
  sendPhonePosition,
  sendTestMessage,
  setIdentity,
}: Props) {
  return (
    <>
      <div className="hud-drawer-backdrop" onClick={onClose} />
      <div className="hud-drawer">
        <div className="hud-drawer-header">
          <h2 style={{ margin: 0 }}>Menu</h2>
          <button className="secondary" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="menu-section-label">Primeiro uso</div>
        <IdentityPanel state={state} setIdentity={setIdentity} />
        <RadioPanel state={state} setLoraSettings={setLoraSettings} setPositionSettings={setPositionSettings} />
        <SquadPanel state={state} createSquad={createSquad} joinSquad={joinSquad} />

        <div className="menu-section-label">Status</div>
        <NodeListPanel state={state} />
        <PositionPanel state={state} sendPhonePosition={sendPhonePosition} />
        <TestMessagePanel state={state} sendTestMessage={sendTestMessage} />

        <button className="secondary" onClick={onOpenDebug}>
          Abrir tela de debug
        </button>
      </div>
    </>
  );
}
