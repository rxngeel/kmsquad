import { useRef, useState } from "react";
import { useMeshtastic } from "./hooks/useMeshtastic";
import { ConnectPanel } from "./components/ConnectPanel";
import { MapView } from "./components/MapView";
import { RadioConfigPanel } from "./components/RadioConfigPanel";
import { NodeListPanel } from "./components/NodeListPanel";
import { PositionPanel } from "./components/PositionPanel";
import { TestMessagePanel } from "./components/TestMessagePanel";
import { DebugScreen } from "./components/DebugScreen";

export default function App() {
  const { state, connect, sendTestMessage, sendPhonePosition } = useMeshtastic();
  const [debugOpen, setDebugOpen] = useState(false);
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

  return (
    <>
      <h1>
        KMS<span style={{ color: "var(--volt)" }}>SQUAD</span>
      </h1>
      <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginTop: -8, marginBottom: 16 }}>
        Fase 2 — mapa e squad (em andamento)
      </p>

      {debugOpen ? (
        <DebugScreen state={state} onClose={() => setDebugOpen(false)} />
      ) : (
        <>
          <ConnectPanel state={state} onConnect={connect} />
          {connected && (
            <>
              <MapView state={state} />
              <RadioConfigPanel state={state} />
              <NodeListPanel state={state} />
              <PositionPanel state={state} sendPhonePosition={sendPhonePosition} />
              <TestMessagePanel state={state} sendTestMessage={sendTestMessage} />
            </>
          )}
        </>
      )}

      <div className="footer-tap" onClick={handleFooterTap}>
        KMSQUAD · toque 5x para abrir o debug
      </div>
    </>
  );
}
