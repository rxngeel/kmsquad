import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/core";

// Mesmo formato de link/QR que o app oficial do Meshtastic usa, pra manter
// compatibilidade (ex.: se alguém escanear com o app oficial, ou um rádio já
// vier configurado por ele). É o protobuf ChannelSet (settings do canal +
// config LoRa) codificado em base64url depois de "https://meshtastic.org/e/#".
const URL_PREFIX = "https://meshtastic.org/e/#";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** PSK forte de 32 bytes (AES256), aleatória de verdade (crypto.getRandomValues). */
export function generateStrongPsk(): Uint8Array {
  const psk = new Uint8Array(32);
  crypto.getRandomValues(psk);
  return psk;
}

/** ID aleatório de 32 bits pro canal (recomendado pelo próprio formato do Meshtastic). */
export function generateChannelId(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

export function encodeChannelUrl(channelSet: Protobuf.AppOnly.ChannelSet): string {
  const bytes = toBinary(Protobuf.AppOnly.ChannelSetSchema, channelSet);
  return `${URL_PREFIX}${toBase64Url(bytes)}`;
}

export function decodeChannelUrl(input: string): Protobuf.AppOnly.ChannelSet {
  const trimmed = input.trim();
  const hashIndex = trimmed.indexOf("#");
  const encoded = hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : trimmed;
  if (!encoded) {
    throw new Error("Link vazio ou sem a parte depois de #.");
  }
  const bytes = fromBase64Url(encoded);
  return fromBinary(Protobuf.AppOnly.ChannelSetSchema, bytes);
}

/** Monta o ChannelSettings do squad: nome curto (até 11 bytes) + PSK forte + precisão máxima de posição. */
export function buildSquadChannelSettings(name: string): Protobuf.Channel.ChannelSettings {
  return create(Protobuf.Channel.ChannelSettingsSchema, {
    name: name.slice(0, 11),
    psk: generateStrongPsk(),
    id: generateChannelId(),
    moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
      positionPrecision: 32, // precisão máxima — ver docs/decisoes.md
    }),
  });
}
