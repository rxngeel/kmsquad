// Protocolo binário do KM-TAK — ver docs/protocolo.md pro formato completo
// e o porquê de cada escolha. Implementação deve bater exatamente com o doc.

export const PROTOCOL_VERSION = 1;

export const MessageType = {
  STATUS: 0x01,
  MARKER: 0x02,
  DIRECTION: 0x03,
  REMOVE_MARKER: 0x04,
} as const;

export const PlayerStatus = {
  VIVO: 0,
  SANGRANDO: 1,
  MORTO: 2,
} as const;
export type PlayerStatusValue = (typeof PlayerStatus)[keyof typeof PlayerStatus];

export const MarkerType = {
  CONTATO: 0,
  OBJETIVO: 1,
  PONTO_DE_ENCONTRO: 2,
  PERIGO: 3,
} as const;
export type MarkerTypeValue = (typeof MarkerType)[keyof typeof MarkerType];

export function encodeStatus(status: PlayerStatusValue): Uint8Array {
  return new Uint8Array([PROTOCOL_VERSION, MessageType.STATUS, status]);
}

export interface MarkerPayload {
  type: MarkerTypeValue;
  id: number;
  latitudeI: number;
  longitudeI: number;
}

export function encodeMarker(marker: MarkerPayload): Uint8Array {
  const buf = new Uint8Array(12);
  const view = new DataView(buf.buffer);
  buf[0] = PROTOCOL_VERSION;
  buf[1] = MessageType.MARKER;
  buf[2] = marker.type;
  buf[3] = marker.id & 0xff;
  view.setInt32(4, marker.latitudeI, true);
  view.setInt32(8, marker.longitudeI, true);
  return buf;
}

/** Remove um marcador pelo id — só o autor original pode remover o dele (o id é escopado por quem criou, via o `from` do pacote Meshtastic). */
export function encodeRemoveMarker(id: number): Uint8Array {
  return new Uint8Array([PROTOCOL_VERSION, MessageType.REMOVE_MARKER, id & 0xff]);
}

export function encodeDirection(headingDegrees: number): Uint8Array {
  const normalized = ((headingDegrees % 360) + 360) % 360;
  const headingByte = Math.round((normalized * 256) / 360) & 0xff;
  return new Uint8Array([PROTOCOL_VERSION, MessageType.DIRECTION, headingByte]);
}

export type DecodedMessage =
  | { type: "status"; status: PlayerStatusValue }
  | { type: "marker"; marker: MarkerPayload }
  | { type: "direction"; headingDegrees: number }
  | { type: "remove_marker"; id: number }
  | { type: "desconhecido"; messageType: number };

/** Retorna null se o pacote não tem o tamanho mínimo esperado ou a versão é futura demais pra entender. */
export function decodeMessage(bytes: Uint8Array): DecodedMessage | null {
  if (bytes.length < 2) return null;
  const version = bytes[0];
  const messageType = bytes[1];
  if (version > PROTOCOL_VERSION) return null; // versão futura — ignora, não tenta interpretar

  switch (messageType) {
    case MessageType.STATUS: {
      if (bytes.length < 3) return null;
      const status = bytes[2];
      if (!Object.values(PlayerStatus).includes(status as PlayerStatusValue)) return null;
      return { type: "status", status: status as PlayerStatusValue };
    }
    case MessageType.MARKER: {
      if (bytes.length < 12) return null;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const type = bytes[2];
      if (!Object.values(MarkerType).includes(type as MarkerTypeValue)) return null;
      return {
        type: "marker",
        marker: {
          type: type as MarkerTypeValue,
          id: bytes[3],
          latitudeI: view.getInt32(4, true),
          longitudeI: view.getInt32(8, true),
        },
      };
    }
    case MessageType.DIRECTION: {
      if (bytes.length < 3) return null;
      const headingDegrees = (bytes[2] * 360) / 256;
      return { type: "direction", headingDegrees };
    }
    case MessageType.REMOVE_MARKER: {
      if (bytes.length < 3) return null;
      return { type: "remove_marker", id: bytes[2] };
    }
    default:
      return { type: "desconhecido", messageType };
  }
}
