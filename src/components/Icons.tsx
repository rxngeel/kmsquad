// Ícones da barra de cima/mapa, em SVG inline (`stroke="currentColor"`, sem
// fill) — mesmo motivo do Brand.tsx: renderiza igual em qualquer navegador.
// Trocamos aqui os que usavam glifo de texto (ex.: "+", "◎") porque o glifo
// NÃO fica centralizado de verdade na caixa (confirmado medindo pixel a
// pixel: o "+" do botão de marcar ficava ~1.5px pra baixo/esquerda do centro
// real do círculo) — e os que usavam `clip-path` sobre `border` (mensagens,
// camadas), porque o corte quebra o contorno em pedaços soltos em vez de
// desenhar a forma inteira.

interface IconProps {
  className?: string;
}

const STROKE = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Mensagens — balão de fala. */
export function IconChat({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...STROKE} aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/** Trocar camada do mapa — pilha de camadas (losango + 2 "V" por baixo). */
export function IconLayers({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...STROKE} aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 12 12 17 22 12" />
      <polyline points="2 17 12 22 22 17" />
    </svg>
  );
}

/** "+" do botão de marcar no mapa — desenhado em vetor pra ficar exatamente centralizado. */
export function IconPlus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...STROKE} strokeWidth={2.5} aria-hidden="true">
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
}
