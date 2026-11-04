import { useState } from "react";
import { Protobuf } from "@meshtastic/core";
import type { MeshState } from "../meshtastic/connection";
import { BRAZIL_REGION, gpsModeLabel, hwModelLabel, presetLabel, regionLabel } from "../meshtastic/format";

interface Props {
  state: MeshState;
  setLoraSettings: (patch: {
    region?: Protobuf.Config.Config_LoRaConfig_RegionCode;
    modemPreset?: Protobuf.Config.Config_LoRaConfig_ModemPreset;
  }) => Promise<void>;
  setPositionSettings: (patch: {
    gpsMode?: Protobuf.Config.Config_PositionConfig_GpsMode;
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

type FieldType = "cqb" | "aberto";

/**
 * Configuração do rádio — status atual + "configuração rápida" (região,
 * preset e intervalo de posição de uma vez, com um toque) pro jogador que
 * só quer abrir o app e jogar. Os controles manuais (pra quem quiser
 * ajustar fino) ficam escondidos atrás de "Configuração avançada".
 */
export function RadioPanel({ state, setLoraSettings, setPositionSettings }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [busyQuick, setBusyQuick] = useState<FieldType | null>(null);
  const [busyLora, setBusyLora] = useState(false);
  const [busyPosition, setBusyPosition] = useState(false);
  const [busyGps, setBusyGps] = useState(false);
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

  const lora = state.loraConfig;
  const position = state.positionConfig;
  const hwModel = state.ownUser?.hwModel;
  const regionOk = lora?.region === BRAZIL_REGION;
  const gpsEnabled = position?.gpsMode === Protobuf.Config.Config_PositionConfig_GpsMode.ENABLED;

  async function applyQuickSetup(field: FieldType) {
    setBusyQuick(field);
    setError(undefined);
    setInfo(undefined);
    try {
      const preset = field === "cqb" ? PRESET_CQB : PRESET_ABERTO;
      await setLoraSettings({ region: BRAZIL_REGION, modemPreset: preset });
      await setPositionSettings(RECOMMENDED_POSITION);
      setDistance(RECOMMENDED_POSITION.broadcastSmartMinimumDistance);
      setMinInterval(RECOMMENDED_POSITION.broadcastSmartMinimumIntervalSecs);
      setHeartbeat(RECOMMENDED_POSITION.positionBroadcastSecs);
      setInfo(
        `Pronto: região Brasil, preset ${presetLabel(preset)} e intervalo de posição recomendado gravados no rádio.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyQuick(null);
    }
  }

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

  async function setGpsSource(mode: Protobuf.Config.Config_PositionConfig_GpsMode) {
    setBusyGps(true);
    setError(undefined);
    setInfo(undefined);
    try {
      await setPositionSettings({ gpsMode: mode });
      setInfo(`Fonte de posição gravada: ${gpsModeLabel(mode)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyGps(false);
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

  return (
    <div className="panel">
      <h2>Rádio</h2>

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
        <span className="label">Fonte de posição</span>
        <span className="value">{gpsModeLabel(position?.gpsMode)}</span>
      </div>
      <div className="row">
        <span className="label">Modelo</span>
        <span className="value">{hwModelLabel(hwModel)}</span>
      </div>

      {lora && !regionOk && (
        <div className="error-box">
          Região não está em BR_902 (Brasil) — fora dessa faixa o rádio pode
          transmitir fora do que a Anatel permite. Use a configuração rápida
          abaixo pra corrigir.
        </div>
      )}

      <h3 style={{ marginTop: 16 }}>Fonte do GPS</h3>
      <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
        Esse rádio tem um chip de GPS de verdade? Se o app não achar sua
        posição no mapa, é bem provável que essa config esteja errada — toque
        no botão certo abaixo pra corrigir.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
        <button
          className={gpsEnabled ? "primary" : "secondary"}
          disabled={busyGps}
          onClick={() => setGpsSource(Protobuf.Config.Config_PositionConfig_GpsMode.ENABLED)}
        >
          Rádio tem GPS
        </button>
        <button
          className={!gpsEnabled ? "primary" : "secondary"}
          disabled={busyGps}
          onClick={() => setGpsSource(Protobuf.Config.Config_PositionConfig_GpsMode.DISABLED)}
        >
          Sem GPS, uso o do celular
        </button>
      </div>

      <h3 style={{ marginTop: 16 }}>Configuração rápida</h3>
      <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
        Ajusta região, potência de transmissão e intervalo de posição de uma
        vez só, pro tipo de campo. Ver docs/airtime.md pro porquê de cada
        número.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
        <button
          className="primary"
          disabled={busyQuick !== null}
          onClick={() => applyQuickSetup("cqb")}
        >
          {busyQuick === "cqb" ? "Gravando…" : "CQB (local fechado)"}
        </button>
        <button
          className="primary"
          disabled={busyQuick !== null}
          onClick={() => applyQuickSetup("aberto")}
        >
          {busyQuick === "aberto" ? "Gravando…" : "Mata / área aberta"}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {info && (
        <div className="error-box" style={{ borderColor: "var(--ok)", color: "var(--ok)" }}>
          {info}
        </div>
      )}

      <button className="secondary" onClick={() => setAdvancedOpen((v) => !v)} style={{ marginTop: 4 }}>
        {advancedOpen ? "Fechar configuração avançada" : "Configuração avançada"}
      </button>

      {advancedOpen && (
        <div style={{ marginTop: 14 }}>
          <h3>Preset de modem (manual)</h3>
          <select
            disabled={busyLora}
            value={lora?.modemPreset ?? PRESET_ABERTO}
            onChange={(e) => applyPreset(Number(e.target.value) as Protobuf.Config.Config_LoRaConfig_ModemPreset)}
          >
            {ALL_PRESETS.map((p) => (
              <option key={p} value={p}>
                {presetLabel(p)}
              </option>
            ))}
          </select>

          {!regionOk && (
            <button className="secondary" disabled={busyLora} onClick={fixRegion} style={{ marginTop: 10 }}>
              Corrigir só a região pra BR_902
            </button>
          )}

          <h3 style={{ marginTop: 16 }}>Intervalo de posição (manual)</h3>
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
          <button className="primary" disabled={busyPosition} onClick={savePositionSettings} style={{ marginTop: 10 }}>
            {busyPosition ? "Gravando…" : "Gravar intervalo"}
          </button>
        </div>
      )}
    </div>
  );
}
