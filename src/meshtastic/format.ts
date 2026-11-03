import { Protobuf } from "@meshtastic/core";
import { PlayerStatus, type PlayerStatusValue } from "./protocol";

const STATUS_LABELS: Record<PlayerStatusValue, string> = {
  [PlayerStatus.VIVO]: "VIVO",
  [PlayerStatus.SANGRANDO]: "SANGRANDO",
  [PlayerStatus.MORTO]: "MORTO",
};

const STATUS_BADGE_CLASS: Record<PlayerStatusValue, string> = {
  [PlayerStatus.VIVO]: "ok",
  [PlayerStatus.SANGRANDO]: "danger",
  [PlayerStatus.MORTO]: "neutral",
};

const STATUS_ORDER: PlayerStatusValue[] = [PlayerStatus.VIVO, PlayerStatus.SANGRANDO, PlayerStatus.MORTO];

/** Pro botão flutuante de status: qual status vem depois ao tocar (cicla). */
export function nextStatus(status: PlayerStatusValue | undefined): PlayerStatusValue {
  const current = status ?? PlayerStatus.VIVO;
  const index = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(index + 1) % STATUS_ORDER.length];
}

export function statusLabel(status: PlayerStatusValue | undefined): string {
  return status !== undefined ? STATUS_LABELS[status] : "VIVO";
}

export function statusBadgeClass(status: PlayerStatusValue | undefined): string {
  return status !== undefined ? STATUS_BADGE_CLASS[status] : "ok";
}

export function formatAge(epochSeconds: number | undefined): string {
  if (!epochSeconds) return "sem dados";
  const diffMs = Date.now() - epochSeconds * 1000;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  return `há ${diffHours} h`;
}

export function isPositionStale(epochSeconds: number | undefined): boolean {
  if (!epochSeconds) return true;
  return Date.now() - epochSeconds * 1000 > 5 * 60 * 1000;
}

// BR_902 existe de verdade no firmware/protobuf oficial do Meshtastic (valor
// 26, "Brazil 902MHz" — ver meshtastic/protobufs no GitHub, config.proto).
// Só que é recente: a versão do pacote @meshtastic/protobufs publicada no
// npm (2.8.0, a mais nova disponível) ainda não tem esse valor no enum —
// por isso o rádio do Ran relatava região 26 e o app não reconhecia. Usamos
// o número direto (26) em vez de Protobuf.Config.Config_LoRaConfig_RegionCode.BR_902
// (que daria undefined nessa versão da lib) até o pacote ser atualizado.
// Ver docs/decisoes.md.
const BR_902 = 26 as Protobuf.Config.Config_LoRaConfig_RegionCode;

const REGION_LABELS: Partial<Record<Protobuf.Config.Config_LoRaConfig_RegionCode, string>> = {
  [Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET]: "NÃO DEFINIDA",
  [Protobuf.Config.Config_LoRaConfig_RegionCode.US]: "EUA (US)",
  [Protobuf.Config.Config_LoRaConfig_RegionCode.ANZ]: "AUSTRÁLIA/NZ (ANZ)",
  [BR_902]: "BRASIL (BR_902)",
};

export const BRAZIL_REGION = BR_902;

export function regionLabel(region: Protobuf.Config.Config_LoRaConfig_RegionCode | undefined): string {
  if (region === undefined) return "—";
  return REGION_LABELS[region] ?? Protobuf.Config.Config_LoRaConfig_RegionCode[region] ?? String(region);
}

export function presetLabel(preset: Protobuf.Config.Config_LoRaConfig_ModemPreset | undefined): string {
  if (preset === undefined) return "—";
  const name = Protobuf.Config.Config_LoRaConfig_ModemPreset[preset];
  return name ? name.replaceAll("_", " ") : String(preset);
}

// gpsMode é uma flag de configuração do rádio, não uma leitura do hardware:
// um V3 (sem chip de GPS) pode estar com gpsMode = ENABLED por engano (ex.:
// config antiga ou copiada de outro rádio) e isso não vira GPS de verdade.
// Para os modelos abaixo sabemos que não existe chip de GPS físico, então a
// config é ignorada e o app usa o GPS do celular mesmo assim.
const HW_MODELS_WITHOUT_GPS = new Set<Protobuf.Mesh.HardwareModel>([
  Protobuf.Mesh.HardwareModel.HELTEC_V3,
]);

export function hwModelLabel(hwModel: Protobuf.Mesh.HardwareModel | undefined): string {
  if (hwModel === undefined) return "—";
  const name = Protobuf.Mesh.HardwareModel[hwModel];
  return name ? name.replaceAll("_", " ") : String(hwModel);
}

export function gpsModeLabel(
  mode: Protobuf.Config.Config_PositionConfig_GpsMode | undefined,
  hwModel: Protobuf.Mesh.HardwareModel | undefined,
): string {
  if (hwModel !== undefined && HW_MODELS_WITHOUT_GPS.has(hwModel)) {
    return "RÁDIO SEM GPS (modo V3 — usa o GPS do celular)";
  }
  switch (mode) {
    case Protobuf.Config.Config_PositionConfig_GpsMode.ENABLED:
      return "GPS DO RÁDIO ATIVO (modo V4)";
    case Protobuf.Config.Config_PositionConfig_GpsMode.DISABLED:
      return "GPS DO RÁDIO DESATIVADO (modo V3 — usa o GPS do celular)";
    case Protobuf.Config.Config_PositionConfig_GpsMode.NOT_PRESENT:
      return "RÁDIO SEM GPS (modo V3 — usa o GPS do celular)";
    default:
      return "DESCONHECIDO";
  }
}

export function isPhoneGpsMode(
  mode: Protobuf.Config.Config_PositionConfig_GpsMode | undefined,
  hwModel: Protobuf.Mesh.HardwareModel | undefined,
): boolean {
  if (hwModel !== undefined && HW_MODELS_WITHOUT_GPS.has(hwModel)) return true;
  return mode !== Protobuf.Config.Config_PositionConfig_GpsMode.ENABLED;
}

/** A config do rádio diz que o GPS está ligado, mas este modelo não tem GPS físico. */
export function gpsConfigMismatch(
  mode: Protobuf.Config.Config_PositionConfig_GpsMode | undefined,
  hwModel: Protobuf.Mesh.HardwareModel | undefined,
): boolean {
  return (
    hwModel !== undefined &&
    HW_MODELS_WITHOUT_GPS.has(hwModel) &&
    mode === Protobuf.Config.Config_PositionConfig_GpsMode.ENABLED
  );
}

/**
 * Rótulo curto pra marcador no mapa: numeral/callsign (shortName), ou as
 * primeiras letras do nome completo, ou o número do nó. Sempre cortado em 4
 * caracteres — o marcador é um círculo pequeno, nome inteiro não cabe (bug
 * relatado: nome vazando pra fora do círculo quando não tinha shortName).
 */
export function labelFor(node: { num: number; user?: Protobuf.Mesh.User }): string {
  const raw = node.user?.shortName || node.user?.longName || `#${node.num}`;
  return raw.trim().slice(0, 4).toUpperCase();
}

export function formatLatLon(latitudeI?: number, longitudeI?: number): string {
  if (latitudeI === undefined || longitudeI === undefined) return "sem posição";
  const lat = latitudeI / 1e7;
  const lon = longitudeI / 1e7;
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
