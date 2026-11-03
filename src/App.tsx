import { useRef, useState } from "react";
import { useMeshtastic } from "./hooks/useMeshtastic";
import { ConnectPanel } from "./components/ConnectPanel";
import { MapView } from "./components/MapView";
import { StatusPanel } from "./components/StatusPanel";
import { HudMenu } from "./components/HudMenu";
import { DebugScreen } from "./components/DebugScreen";
import type { MeshState } from "./meshtastic/connection";

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
    sendStatus,
  } = useMeshtastic();
  const [debugOpen, setDebugOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <div className="hud-shell">
      <MapView state={state} />
      <div className="hud-frame" />

      <div className="hud-topbar">
        <span className={`badge ${badge.cls}`}>{badge.label}</span>
        <button className="hud-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
          ☰
        </button>
      </div>

      <StatusPanel state={state} sendStatus={sendStatus} />

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
        />
      )}
    </div>
  );
}
