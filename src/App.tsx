import { useCallback, useRef, useState } from "react";
import { useMeshtastic } from "./hooks/useMeshtastic";
import { useCompass } from "./hooks/useCompass";
import { ConnectPanel } from "./components/ConnectPanel";
import { MapView } from "./components/MapView";
import { HudMenu } from "./components/HudMenu";
import { DebugScreen } from "./components/DebugScreen";
import { NodeListPanel } from "./components/NodeListPanel";
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
        <DebugScreen state={state} onClose={() => setDebugOpen(false)} />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="setup-screen">
        <h1>
          K<span style={{ color: "var(--volt)" }}>-TAK</span>
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginTop: -8, marginBottom: 16 }}>
          Fase 3 — funções de jogo (em andamento)
        </p>
        <ConnectPanel state={state} onConnect={connect} />
        <div className="footer-tap" onClick={handleFooterTap}>
          K-TAK · toque 5x para abrir o debug
        </div>
      </div>
    );
  }

  const badge = STATUS_BADGE[state.status];
  const otherNodesCount = Array.from(state.nodes.keys()).filter((num) => num !== state.myNodeNum).length;
  const ownLabel = state.myNodeNum !== undefined ? labelFor({ num: state.myNodeNum, user: state.ownUser }) : "—";

  return (
    <div className="hud-shell">
      <MapView state={state} sendMarker={sendMarker} removeMarker={removeMarker} />
      <div className="hud-frame" />
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
            NÓS {otherNodesCount}
          </button>
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
          sendTestMessage={sendTestMessage}
          setIdentity={setIdentity}
        />
      )}
    </div>
  );
}
