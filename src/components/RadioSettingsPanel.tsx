import { useState } from "react";
import { Protobuf } from "@meshtastic/core";
import type { MeshState } from "../meshtastic/connection";
import { BRAZIL_REGION, presetLabel } from "../meshtastic/format";

interface Props {
  state: MeshState;
  setLoraSettings: (patch: {
    region?: Protobuf.Config.Config_LoRaConfig_RegionCode;
    modemPreset?: Protobuf.Config.Config_LoRaConfig_ModemPreset;
  }) => Promise<void>;
  setPositionSettings: (patch: {
    positionBroadcastSecs?: number;
    broadcastSmartMinimumDistance?: number;
    broadcastSmartMinimumIntervalSecs?: number;
  }) => Promise<void>;
}

// Recomendações calculadas em docs/airtime.md.
const PRESET_CQB = Protobuf.Config.Config_LoRaConfig_ModemPreset.MEDIUM_FAST;
const PRESET_ABERTO = Protobuf.Config.Config_LoRaConfig_ModemPreset.LONG_FAST;
const RECOMMENDED_POSITION = {
  broadcastSmartMinimumDistance: 12,
  broadcastSmartMinimumIntervalSecs: 20,
  positionBroadcastSecs: 300,
};

const ALL_PRESETS = [
  Protobuf.Config.Config_LoRaConfig_ModemPreset.SHORT_TURBO,
  Protobuf.Config.Config_LoRaConfig_ModemPreset.SHORT_FAST,
  Protobuf.Config.Config_LoRaConfig_ModemPreset.SHORT_SLOW,
  Protobuf.Config.Config_LoRaConfig_ModemPreset.MEDIUM_FAST,
  Protobuf.Config.Config_LoRaConfig_ModemPreset.MEDIUM_SLOW,
  Protobuf.Config.Config_LoRaConfig_ModemPreset.LONG_FAST,
  Protobuf.Config.Config_LoRaConfig_ModemPreset.LONG_MODERATE,
  Protobuf.Config.Config_LoRaConfig_ModemPreset.LONG_SLOW,
];

export function RadioSettingsPanel({ state, setLoraSettings, setPositionSettings }: Props) {
  const [open, setOpen] = useState(false);
  const [busyLora, setBusyLora] = useState(false);
  const [busyPosition, setBusyPosition] = useState(false);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();

  const [distance, setDistance] = useState(
    state.positionConfig?.broadcastSmartMinimumDistance || RECOMMENDED_POSITION.broadcastSmartMinimumDistance,
  );
  const [minInterval, setMinInterval] = useState(
    state.positionConfig?.broadcastSmartMinimumIntervalSecs ||
      RECOMMENDED_POSITION.broadcastSmartMinimumIntervalSecs,
  );
  const [heartbeat, setHeartbeat] = useState(
    state.positionConfig?.positionBroadcastSecs || RECOMMENDED_POSITION.positionBroadcastSecs,
  );

  const regionOk = state.loraConfig?.region === BRAZIL_REGION;

  async function applyPreset(preset: Protobuf.Config.Config_LoRaConfig_ModemPreset) {
    setBusyLora(true);
    setError(undefined);
    setInfo(undefined);
    try {
      await setLoraSettings({ modemPreset: preset });
      setInfo(`Preset ${presetLabel(preset)} gravado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyLora(false);
    }
  }

  async function fixRegion() {
    setBusyLora(true);
    setError(undefined);
    setInfo(undefined);
    try {
      await setLoraSettings({ region: BRAZIL_REGION });
      setInfo("Região corrigida pra BR_902.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyLora(false);
    }
  }

  async function savePositionSettings() {
    setBusyPosition(true);
    setError(undefined);
    setInfo(undefined);
    try {
      await setPositionSettings({
        broadcastSmartMinimumDistance: distance,
        broadcastSmartMinimumIntervalSecs: minInterval,
        positionBroadcastSecs: heartbeat,
      });
      setInfo("Intervalo de posição gravado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyPosition(false);
    }
  }

  if (!open) {
    return (
      <div className="panel">
        <h2>Configurar rádio</h2>
        <button className="secondary" onClick={() => setOpen(true)}>
          Abrir configurações
        </button>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Configurar rádio</h2>

      <h3>Preset de modem</h3>
      <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
        Atual: {presetLabel(state.loraConfig?.modemPreset)}. Ver docs/airtime.md
        pra entender o porquê de cada recomendação.
      </p>
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <button className="primary" disabled={busyLora} onClick={() => applyPreset(PRESET_CQB)}>
          CQB ({presetLabel(PRESET_CQB)})
        </button>
        <button className="primary" disabled={busyLora} onClick={() => applyPreset(PRESET_ABERTO)}>
          Mata/aberto ({presetLabel(PRESET_ABERTO)})
        </button>
      </div>
      <select
        disabled={busyLora}
        value={state.loraConfig?.modemPreset ?? PRESET_ABERTO}
        onChange={(e) => applyPreset(Number(e.target.value) as Protobuf.Config.Config_LoRaConfig_ModemPreset)}
      >
        {ALL_PRESETS.map((p) => (
          <option key={p} value={p}>
            {presetLabel(p)}
          </option>
        ))}
      </select>

      <h3 style={{ marginTop: 16 }}>Região</h3>
      <div className="row">
        <span className="label">Atual</span>
        <span className="value">{regionOk ? "BRASIL (BR_902) ✓" : "DIFERENTE DE BR_902"}</span>
      </div>
      {!regionOk && (
        <button className="primary" disabled={busyLora} onClick={fixRegion} style={{ marginTop: 10 }}>
          Corrigir região pra BR_902
        </button>
      )}

      <h3 style={{ marginTop: 16 }}>Intervalo de posição (envio inteligente)</h3>
      <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
        Manda a posição quando o jogador se mexe; se ficar parado, manda um
        heartbeat espaçado mesmo assim.
      </p>
      <div className="row">
        <span className="label">Distância mínima pra mandar (m)</span>
        <input
          type="number"
          min={1}
          style={{ width: 80, marginBottom: 0 }}
          value={distance}
          onChange={(e) => setDistance(Number(e.target.value))}
        />
      </div>
      <div className="row">
        <span className="label">Intervalo mínimo entre envios (s)</span>
        <input
          type="number"
          min={5}
          style={{ width: 80, marginBottom: 0 }}
          value={minInterval}
          onChange={(e) => setMinInterval(Number(e.target.value))}
        />
      </div>
      <div className="row">
        <span className="label">Heartbeat parado (s)</span>
        <input
          type="number"
          min={30}
          style={{ width: 80, marginBottom: 0 }}
          value={heartbeat}
          onChange={(e) => setHeartbeat(Number(e.target.value))}
        />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button
          className="secondary"
          onClick={() => {
            setDistance(RECOMMENDED_POSITION.broadcastSmartMinimumDistance);
            setMinInterval(RECOMMENDED_POSITION.broadcastSmartMinimumIntervalSecs);
            setHeartbeat(RECOMMENDED_POSITION.positionBroadcastSecs);
          }}
        >
          Usar recomendado
        </button>
        <button className="primary" disabled={busyPosition} onClick={savePositionSettings}>
          {busyPosition ? "Gravando…" : "Gravar intervalo"}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {info && (
        <div className="error-box" style={{ borderColor: "var(--ok)", color: "var(--ok)" }}>
          {info}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <button className="secondary" onClick={() => setOpen(false)}>
          Fechar
        </button>
      </div>
    </div>
  );
}
