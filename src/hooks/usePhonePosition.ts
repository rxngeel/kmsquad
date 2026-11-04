import { useEffect, useRef, useState } from "react";

// Modo V3 (rádio sem GPS): o app lê a geolocalização do celular e manda pro
// rádio retransmitir. Precisa viver num hook PERSISTENTE no nível do App —
// não dentro do painel de "Status & ferramentas" do menu — porque esse
// painel desmonta toda vez que o jogador fecha o menu (ou troca de seção) pra
// voltar a olhar o mapa, que é o uso normal durante o jogo. Antes esse estado
// (watchPosition, Wake Lock) vivia dentro do próprio painel, e o
// `useEffect` de limpeza desligava o envio de posição sozinho, sem aviso,
// assim que o painel desmontava — sintoma real reportado: "envia, e
// rapidamente já desativa, e os outros não veem". Ver docs/decisoes.md.
interface Options {
  onPosition: (lat: number, lon: number, alt?: number) => void;
}

export function usePhonePosition({ onPosition }: Options) {
  const [active, setActive] = useState(false);
  const [lastSent, setLastSent] = useState<string>("—");
  const [accuracy, setAccuracy] = useState<number>();
  const [error, setError] = useState<string>();
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  // só desliga de vez quando o APP INTEIRO fecha/recarrega, não quando um
  // painel que só mostra esse status é desmontado.
  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    if (!navigator.geolocation) {
      setError("Este navegador não tem acesso ao GPS.");
      return;
    }
    setError(undefined);
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
        const { latitude, longitude, altitude, accuracy } = pos.coords;
        onPositionRef.current(latitude, longitude, altitude ?? undefined);
        setLastSent(new Date().toLocaleTimeString("pt-BR"));
        setAccuracy(accuracy);
      },
      (err) => setError(`Erro de GPS: ${err.message}`),
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

  return { active, lastSent, accuracy, error, start, stop };
}
