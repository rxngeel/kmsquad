import { Protobuf } from "@meshtastic/core";
import type { MeshState } from "../meshtastic/connection";
import { gpsModeLabel, presetLabel, regionLabel } from "../meshtastic/format";

interface Props {
  state: MeshState;
}

export function RadioConfigPanel({ state }: Props) {
  const lora = state.loraConfig;
  const position = state.positionConfig;
  const channelCount = state.channels.size;
  const ownName = state.ownUser?.longName ?? "—";
  const regionOk = lora?.region === Protobuf.Config.Config_LoRaConfig_RegionCode.BR_902;

  return (
    <div className="panel">
      <h2>Config atual do rádio</h2>
      <div className="row">
        <span className="label">Nome</span>
        <span className="value">{ownName}</span>
      </div>
      <div className="row">
        <span className="label">Região</span>
        <span className="value">
          {regionLabel(lora?.region)}
          {lora && !regionOk && " ⚠"}
        </span>
      </div>
      <div className="row">
        <span className="label">Preset</span>
        <span className="value">{presetLabel(lora?.modemPreset)}</span>
      </div>
      <div className="row">
        <span className="label">Canais</span>
        <span className="value">{channelCount || "—"}</span>
      </div>
      <div className="row">
        <span className="label">Fonte de posição</span>
        <span className="value">{gpsModeLabel(position?.gpsMode)}</span>
      </div>
      {lora && !regionOk && (
        <div className="error-box">
          Região não está em BR_902 (Brasil). Fora dessa faixa o rádio pode
          transmitir fora do que a Anatel permite. Ajuste no app oficial
          Meshtastic antes de usar em campo.
        </div>
      )}
    </div>
  );
}
