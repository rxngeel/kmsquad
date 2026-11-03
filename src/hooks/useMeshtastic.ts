import { useEffect, useState } from "react";
import type { Protobuf } from "@meshtastic/core";
import { MeshtasticConnection, createInitialState, type MeshState } from "../meshtastic/connection";

export function useMeshtastic() {
  const [connection] = useState(() => new MeshtasticConnection());
  const [state, setState] = useState<MeshState>(createInitialState());

  useEffect(() => connection.subscribe(setState), [connection]);

  return {
    state,
    connect: () => connection.connect(),
    disconnect: () => connection.disconnect(),
    sendTestMessage: (text: string) => connection.sendTestMessage(text),
    sendPhonePosition: (lat: number, lon: number, alt?: number) =>
      connection.sendPhonePosition(lat, lon, alt),
    createSquad: (name: string) => connection.createSquad(name),
    joinSquad: (url: string) => connection.joinSquad(url),
    setLoraSettings: (patch: {
      region?: Protobuf.Config.Config_LoRaConfig_RegionCode;
      modemPreset?: Protobuf.Config.Config_LoRaConfig_ModemPreset;
    }) => connection.setLoraSettings(patch),
    setPositionSettings: (patch: {
      positionBroadcastSecs?: number;
      broadcastSmartMinimumDistance?: number;
      broadcastSmartMinimumIntervalSecs?: number;
    }) => connection.setPositionSettings(patch),
  };
}
