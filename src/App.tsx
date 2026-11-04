import { useCallback, useRef, useState } from "react";
import { useMeshtastic } from "./hooks/useMeshtastic";
import { useCompass } from "./hooks/useCompass";
import { ConnectPanel } from "./components/ConnectPanel";
import { MapView, BASE_LAYERS, type BaseLayerId } from "./components/MapView";
import { HudMenu } from "./components/HudMenu";
import { DebugScreen } from "./components/DebugScreen";
import { NodeListPanel } from "./components/NodeListPanel";
import { ChatPanel } from "./components/ChatPanel";
import { KmtakWordmark } from "./components/Brand";
import type { MeshState } from "./meshtastic/connection";
import { labelFor } from "./meshtastic/format";

const STATUS_BADGE: Record<MeshState["status"], { label: string; cls: string }> = {
  desconectado: { label: "DESCONECTADO", cls: "neutral" },
  conectando: { label: "CONECTANDO…", cls: "warn" },
  configurando: { label: "LENDO CONFIG…", cls: "warn" },
  configurado: { label: "CONECTADO", cls: "ok" },
  erro: { label: "ERRO", cls: "danger" },
};

export default function App() {
  const {
    state,
    connect,
    disconnect,
    sendTestMessage,
    sendPhonePosition,
    createSquad,
    joinSquad,
    setLoraSettings,
    setPositionSettings,
    setIdentity,
    sendMarker,
    removeMarker,
    sendDirection,
  } = useMeshtastic();
  const [debugOpen, setDebugOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nodesOpen, setNodesOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [offlineOpen, setOfflineOpen] = useState(false);
  // Satélite é a visão que mostra o terreno de verdade (prédios, trilhas) —
  // pedido do Ran pra abrir já nela, em vez do Relevo (melhor pra
  // mata/elevação, mas menos reconhecível de cara).
  const [baseLayerId, setBaseLayerId] = useState<BaseLayerId>("satelite");
  const [gridEnabled, setGridEnabled] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleHeading = useCallback((degrees: number) => sendDirection(degrees), [sendDirection]);
  const compass = useCompass({ onHeading: handleHeading });

  const connected = state.status === "configurado";

  function handleFooterTap() {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => (tapCountRef.current = 0), 1500);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setDebugOpen(true);
    }
  }

  if (debugOpen) {
    return (
      <div className="setup-screen">
        <DebugScreen state={state} onClose={() => setDebugOpen(false)} disconnect={disconnect} />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="connect-screen">
        <div className="connect-hero">
          <KmtakWordmark className="connect-logo" />
          <p className="connect-tagline">RASTREAMENTO TÁTICO DE SQUAD</p>
        </div>
        <ConnectPanel state={state} onConnect={connect} />
        <div className="footer-tap" onClick={handleFooterTap}>
          KM-TAK · toque 5x para abrir o debug
        </div>
      </div>
    );
  }

  const badge = STATUS_BADGE[state.status];
  const otherNodesCount = Array.from(state.nodes.keys()).filter((num) => num !== state.myNodeNum).length;
  const ownLabel = state.myNodeNum !== undefined ? labelFor({ num: state.myNodeNum, user: state.ownUser }) : "—";

  return (
    <div className="hud-shell">
      <MapView
        state={state}
        sendMarker={sendMarker}
        removeMarker={removeMarker}
        baseLayerId={baseLayerId}
        gridEnabled={gridEnabled}
        offlineOpen={offlineOpen}
        onCloseOffline={() => setOfflineOpen(false)}
      />
      <div className="hud-self-badge">{ownLabel}</div>

      <div className="hud-topbar">
        <button
          className={`hud-compass-btn ${compass.enabled ? "hud-compass-btn--active" : ""}`}
          onClick={compass.toggle}
          aria-label={compass.enabled ? "Desativar bússola" : "Ativar bússola"}
          title="Bússola"
        >
          <span
            className="hud-compass-needle"
            style={{ transform: compass.enabled && compass.heading !== undefined ? `rotate(${compass.heading}deg)` : undefined }}
          >
            ▲
          </span>
        </button>
        <span className={`badge ${badge.cls}`}>{badge.label}</span>
        <div className="hud-topbar-actions">
          <button className="hud-nodes-btn" onClick={() => setNodesOpen(true)} aria-label="Ver nós do squad" title="Nós do squad">
            <span className="hud-icon-dot2">
              <span />
              <span />
            </span>
            {otherNodesCount}
          </button>
          <button className="hud-menu-btn" onClick={() => setChatOpen(true)} aria-label="Mensagens" title="Mensagens">
            <span className="hud-icon-chat" />
          </button>
          <button
            className={`hud-menu-btn ${gridEnabled ? "hud-menu-btn--active" : ""}`}
            onClick={() => setGridEnabled((v) => !v)}
            aria-label={gridEnabled ? "Desligar grade" : "Ligar grade"}
            title="Grade de referência"
          >
            <span className="hud-icon-grid" />
          </button>
          <button
            className="hud-menu-btn"
            onClick={() => setOfflineOpen(true)}
            aria-label="Mapa offline"
            title="Mapa offline (baixar área / foto do campo)"
          >
            <span className="hud-icon-download">
              <span />
            </span>
          </button>
          <div className="hud-layers-wrap">
            <button className="hud-menu-btn" onClick={() => setLayersOpen((v) => !v)} aria-label="Trocar camada do mapa" title="Camada do mapa">
              <span className="hud-icon-layers">
                <span />
                <span />
              </span>
            </button>
            {layersOpen && (
              <>
                <div className="hud-layers-backdrop" onClick={() => setLayersOpen(false)} />
                <div className="hud-layers-menu">
                {(Object.keys(BASE_LAYERS) as BaseLayerId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={id === baseLayerId ? "active" : ""}
                    onClick={() => {
                      setBaseLayerId(id);
                      setLayersOpen(false);
                    }}
                  >
                    {BASE_LAYERS[id].label}
                  </button>
                ))}
                </div>
              </>
            )}
          </div>
          <button className="hud-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
            ☰
          </button>
        </div>
      </div>
      {compass.error && <div className="hud-compass-error">{compass.error}</div>}

      {nodesOpen && (
        <>
          <div className="hud-drawer-backdrop" onClick={() => setNodesOpen(false)} />
          <div className="hud-drawer">
            <div className="hud-drawer-header">
              <h2 style={{ margin: 0 }}>Nós do squad</h2>
              <button className="secondary" onClick={() => setNodesOpen(false)}>
                Fechar
              </button>
            </div>
            <NodeListPanel state={state} />
          </div>
        </>
      )}

      {chatOpen && (
        <>
          <div className="hud-drawer-backdrop" onClick={() => setChatOpen(false)} />
          <div className="hud-drawer">
            <div className="hud-drawer-header">
              <h2 style={{ margin: 0 }}>Mensagens</h2>
              <button className="secondary" onClick={() => setChatOpen(false)}>
                Fechar
              </button>
            </div>
            <ChatPanel state={state} sendTestMessage={sendTestMessage} />
          </div>
        </>
      )}

      {menuOpen && (
        <HudMenu
          state={state}
          onClose={() => setMenuOpen(false)}
          onOpenDebug={() => {
            setMenuOpen(false);
            setDebugOpen(true);
          }}
          createSquad={createSquad}
          joinSquad={joinSquad}
          setLoraSettings={setLoraSettings}
          setPositionSettings={setPositionSettings}
          sendPhonePosition={sendPhonePosition}
          setIdentity={setIdentity}
        />
      )}
    </div>
  );
}
