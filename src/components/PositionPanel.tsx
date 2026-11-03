import { useEffect, useRef, useState } from "react";
import type { MeshState } from "../meshtastic/connection";
import { isPhoneGpsMode } from "../meshtastic/format";

interface Props {
  state: MeshState;
  sendPhonePosition: (lat: number, lon: number, alt?: number) => Promise<void>;
}

export function PositionPanel({ state, sendPhonePosition }: Props) {
  const [active, setActive] = useState(false);
  const [lastSent, setLastSent] = useState<string>("—");
  const [gpsError, setGpsError] = useState<string>();
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const phoneMode = isPhoneGpsMode(state.positionConfig?.gpsMode);

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    if (!navigator.geolocation) {
      setGpsError("Este navegador não tem acesso ao GPS.");
      return;
    }
    setGpsError(undefined);
    setActive(true);

    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await (navigator as Navigator & {
          wakeLock: { request: (type: "screen") => Promise<WakeLockSentinel> };
        }).wakeLock.request("screen");
      } catch {
        // Bluefy pode não suportar; o jogador precisa manter a tela acesa manualmente.
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, altitude } = pos.coords;
        sendPhonePosition(latitude, longitude, altitude ?? undefined);
        setLastSent(new Date().toLocaleTimeString("pt-BR"));
      },
      (err) => setGpsError(`Erro de GPS: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }

  function stop() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    setActive(false);
  }

  if (!phoneMode) {
    return (
      <div className="panel">
        <h2>Posição</h2>
        <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
          Este rádio está em modo V4 (GPS próprio ligado). Não é preciso
          enviar a posição do celular — deixe o rádio no bolso.
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Posição (modo V3)</h2>
      <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
        Este rádio não tem GPS próprio ativo. Mantenha esta página aberta e a
        tela acesa para enviar sua posição.
      </p>
      {gpsError && <div className="error-box">{gpsError}</div>}
      <div className="row">
        <span className="label">Último envio</span>
        <span className="value">{lastSent}</span>
      </div>
      <div style={{ marginTop: 12 }}>
        <button className={active ? "secondary" : "primary"} onClick={active ? stop : start}>
          {active ? "Parar envio de posição" : "Começar a enviar minha posição"}
        </button>
      </div>
    </div>
  );
}
