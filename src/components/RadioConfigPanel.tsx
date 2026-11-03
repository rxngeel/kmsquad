import { Protobuf } from "@meshtastic/core";
import type { MeshState } from "../meshtastic/connection";
import {
  gpsConfigMismatch,
  gpsModeLabel,
  hwModelLabel,
  presetLabel,
  regionLabel,
} from "../meshtastic/format";

interface Props {
  state: MeshState;
}

export function RadioConfigPanel({ state }: Props) {
  const lora = state.loraConfig;
  const position = state.positionConfig;
  const channelCount = state.channels.size;
  const ownName = state.ownUser?.longName ?? "—";
  const hwModel = state.ownUser?.hwModel;
  const regionOk = lora?.region === Protobuf.Config.Config_LoRaConfig_RegionCode.BR_902;
  const gpsMismatch = gpsConfigMismatch(position?.gpsMode, hwModel);

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
        <span className="label">Modelo</span>
        <span className="value">{hwModelLabel(hwModel)}</span>
      </div>
      <div className="row">
        <span className="label">Fonte de posição</span>
        <span className="value">
          {gpsModeLabel(position?.gpsMode, hwModel)}
          {gpsMismatch && " ⚠"}
        </span>
      </div>
      {lora && !regionOk && (
        <div className="error-box">
          Região não está em BR_902 (Brasil). Fora dessa faixa o rádio pode
          transmitir fora do que a Anatel permite. Ajuste no app oficial
          Meshtastic antes de usar em campo.
        </div>
      )}
      {gpsMismatch && (
        <div className="error-box">
          A config deste rádio diz que o GPS está ligado, mas o modelo{" "}
          {hwModelLabel(hwModel)} não tem chip de GPS. O app está ignorando
          essa config e usando o GPS do celular. Vale corrigir essa config no
          app oficial Meshtastic pra não confundir depois.
        </div>
      )}
    </div>
  );
}
