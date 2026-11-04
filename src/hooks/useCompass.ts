import { useEffect, useRef, useState } from "react";

// iOS (Safari/WebKit — o motor do Bluefy) expõe webkitCompassHeading, que já
// vem em graus a partir do norte, sentido horário — não documentado/padrão,
// mas é o jeito confiável de ter bússola de verdade no iPhone. Em outros
// navegadores caímos pro `alpha` padrão (menos preciso, não é "norte
// verdadeiro", mas serve). Ver docs/decisoes.md.
interface WebkitOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

interface DeviceOrientationEventWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

interface Options {
  onHeading: (degrees: number) => void;
  throttleMs?: number;
}

export function useCompass({ onHeading, throttleMs = 2000 }: Options) {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string>();
  // heading "ao vivo", pro ponteiro da bússola na tela — atualiza a cada
  // evento, sem o throttle (que existe só pra economizar airtime no envio
  // pro squad, não faz sentido pro desenho local).
  const [heading, setHeading] = useState<number>();
  const lastSentRef = useRef(0);
  const onHeadingRef = useRef(onHeading);
  onHeadingRef.current = onHeading;

  useEffect(() => {
    if (!enabled) return;
    lastSentRef.current = 0; // "ainda não recebi nenhum heading" nesta ativação

    function handleOrientation(event: WebkitOrientationEvent) {
      let newHeading: number | undefined;
      if (typeof event.webkitCompassHeading === "number") {
        newHeading = event.webkitCompassHeading;
      } else if (event.absolute && event.alpha !== null) {
        newHeading = (360 - event.alpha) % 360;
      }
      if (newHeading === undefined) return;
      setHeading(newHeading);

      const now = Date.now();
      if (now - lastSentRef.current >= throttleMs) {
        lastSentRef.current = now;
        onHeadingRef.current(newHeading);
      }
    }

    window.addEventListener("deviceorientation", handleOrientation as EventListener);

    // Alguns navegadores (ex.: WKWebView de apps como o Bluefy, se o app não
    // tiver permissão de "Movimento e Fitness" no iOS) nunca disparam
    // `deviceorientation`, mesmo com a permissão do W3C concedida — aí o
    // botão liga e nada acontece, sem erro nenhum. Se depois de alguns
    // segundos nenhum heading chegou, desliga sozinho e avisa, em vez de
    // ficar "ligado" pra sempre sem fazer nada.
    const timeout = setTimeout(() => {
      if (lastSentRef.current === 0) {
        setError(
          "Não recebi dados do sensor de bússola. Verifique em Ajustes do iPhone → Privacidade e Segurança → Movimento e Fitness se o Bluefy tem permissão. Se já tiver e continuar assim, esse navegador não dá acesso à bússola.",
        );
        setEnabled(false);
        setHeading(undefined);
      }
    }, 4000);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation as EventListener);
      clearTimeout(timeout);
    };
  }, [enabled, throttleMs]);

  async function toggle() {
    if (enabled) {
      setEnabled(false);
      setHeading(undefined);
      return;
    }
    setError(undefined);
    if (typeof DeviceOrientationEvent === "undefined") {
      setError("Este navegador não tem sensor de bússola.");
      return;
    }
    try {
      const DOE = DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission;
      if (typeof DOE.requestPermission === "function") {
        const result = await DOE.requestPermission();
        if (result !== "granted") {
          setError("Permissão de bússola negada — ative em Ajustes se mudar de ideia.");
          return;
        }
      }
      setEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return { enabled, error, heading, toggle };
}
