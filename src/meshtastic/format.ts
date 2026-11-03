import { Protobuf } from "@meshtastic/core";

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

const REGION_LABELS: Partial<Record<Protobuf.Config.Config_LoRaConfig_RegionCode, string>> = {
  [Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET]: "NÃO DEFINIDA",
  [Protobuf.Config.Config_LoRaConfig_RegionCode.BR_902]: "BRASIL (BR_902)",
  [Protobuf.Config.Config_LoRaConfig_RegionCode.US]: "EUA (US)",
  [Protobuf.Config.Config_LoRaConfig_RegionCode.ANZ]: "AUSTRÁLIA/NZ (ANZ)",
};

export function regionLabel(region: Protobuf.Config.Config_LoRaConfig_RegionCode | undefined): string {
  if (region === undefined) return "—";
  return REGION_LABELS[region] ?? Protobuf.Config.Config_LoRaConfig_RegionCode[region] ?? String(region);
}

export function presetLabel(preset: Protobuf.Config.Config_LoRaConfig_ModemPreset | undefined): string {
  if (preset === undefined) return "—";
  const name = Protobuf.Config.Config_LoRaConfig_ModemPreset[preset];
  return name ? name.replaceAll("_", " ") : String(preset);
}

export function gpsModeLabel(mode: Protobuf.Config.Config_PositionConfig_GpsMode | undefined): string {
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

export function isPhoneGpsMode(mode: Protobuf.Config.Config_PositionConfig_GpsMode | undefined): boolean {
  return mode !== Protobuf.Config.Config_PositionConfig_GpsMode.ENABLED;
}

export function formatLatLon(latitudeI?: number, longitudeI?: number): string {
  if (latitudeI === undefined || longitudeI === undefined) return "sem posição";
  const lat = latitudeI / 1e7;
  const lon = longitudeI / 1e7;
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
