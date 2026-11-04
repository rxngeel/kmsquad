import { useState } from "react";
import type { MeshState } from "../meshtastic/connection";
import type { Protobuf } from "@meshtastic/core";
import { IdentityPanel } from "./IdentityPanel";
import { RadioPanel } from "./RadioPanel";
import { SquadPanel } from "./SquadPanel";
import { PositionPanel } from "./PositionPanel";

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
    gpsMode?: Protobuf.Config.Config_PositionConfig_GpsMode;
    positionBroadcastSecs?: number;
    broadcastSmartMinimumDistance?: number;
    broadcastSmartMinimumIntervalSecs?: number;
  }) => Promise<void>;
  sendPhonePosition: (lat: number, lon: number, alt?: number) => Promise<void>;
  setIdentity: (longName: string, shortName: string) => Promise<void>;
}

type Section = "usuario" | "radio" | "squad" | "status" | null;

const SECTION_TITLE: Record<Exclude<Section, null>, string> = {
  usuario: "Setup usuário",
  radio: "Configurações de rádio",
  squad: "Setup K-TAK",
  status: "Status & ferramentas",
};

/**
 * Menu lateral do HUD, em 2 níveis: a raiz só lista categorias (poucas
 * opções, fácil de escanear); cada categoria abre num sub-menu próprio com
 * "Voltar". Rádio vem antes de Squad na raiz mesmo "K-TAK" sendo citado
 * primeiro por nome, porque criar um squad grava a config LoRa atual no
 * link que sai pros outros jogadores — o rádio precisa estar certo ANTES
 * (ver docs/decisoes.md). Nós vistos e mensagens têm botão próprio na barra
 * de cima (olhados com frequência durante o jogo) — não duplicados aqui.
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
  setIdentity,
}: Props) {
  const [section, setSection] = useState<Section>(null);

  return (
    <>
      <div className="hud-drawer-backdrop" onClick={onClose} />
      <div className="hud-drawer">
        <div className="hud-drawer-header">
          <h2 style={{ margin: 0 }}>{section ? SECTION_TITLE[section] : "Menu"}</h2>
          <button className="secondary" onClick={section ? () => setSection(null) : onClose}>
            {section ? "Voltar" : "Fechar"}
          </button>
        </div>

        {section === null && (
          <div className="menu-category-list">
            <button className="menu-category-btn" onClick={() => setSection("usuario")}>
              <span>
                <span className="menu-category-title">Setup usuário</span>
                <span className="menu-category-sub">Nome e numeral/callsign</span>
              </span>
              <span className="menu-category-chevron">›</span>
            </button>
            <button className="menu-category-btn" onClick={() => setSection("radio")}>
              <span>
                <span className="menu-category-title">Configurações de rádio</span>
                <span className="menu-category-sub">Região, preset, GPS, intervalo</span>
              </span>
              <span className="menu-category-chevron">›</span>
            </button>
            <button className="menu-category-btn" onClick={() => setSection("squad")}>
              <span>
                <span className="menu-category-title">Setup K-TAK</span>
                <span className="menu-category-sub">Criar ou entrar num squad</span>
              </span>
              <span className="menu-category-chevron">›</span>
            </button>
            <button className="menu-category-btn" onClick={() => setSection("status")}>
              <span>
                <span className="menu-category-title">Status &amp; ferramentas</span>
                <span className="menu-category-sub">Posição manual, debug</span>
              </span>
              <span className="menu-category-chevron">›</span>
            </button>
          </div>
        )}

        {section === "usuario" && <IdentityPanel state={state} setIdentity={setIdentity} />}

        {section === "radio" && (
          <RadioPanel state={state} setLoraSettings={setLoraSettings} setPositionSettings={setPositionSettings} />
        )}

        {section === "squad" && <SquadPanel state={state} createSquad={createSquad} joinSquad={joinSquad} />}

        {section === "status" && (
          <>
            <PositionPanel state={state} sendPhonePosition={sendPhonePosition} />
            <button className="secondary" onClick={onOpenDebug}>
              Abrir tela de debug
            </button>
          </>
        )}
      </div>
    </>
  );
}
