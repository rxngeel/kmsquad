// Marca KM-TAK — vetor fornecido pelo Ran (águia + logotipo "KMTAK").
// `fill="currentColor"` deixa recolorir pelo CSS (color) de onde for usado,
// em vez de fixar uma cor só (igual os outros ícones do app).

const EAGLE_PATH =
  "M78 259 L178 117 Q185 108 197 108 L275 108 Q298 108 307 118 Q317 129 319 144 Q335 144 344 153 Q350 161 347 175 L338 197 Q336 202 331 200 L325 184 Q323 179 316 177 Q305 173 292 178 Q281 183 276 196 L256 254 L219 224 Z";

interface IconProps {
  className?: string;
}

/** Só o ícone da águia — pros lugares que antes usavam só a letra "K". */
export function EagleIcon({ className }: IconProps) {
  return (
    <svg viewBox="63 93 304 181" className={className} fill="currentColor" aria-hidden="true">
      <path d={EAGLE_PATH} />
    </svg>
  );
}

/** Logotipo completo (águia + "KMTAK"), pra onde a marca aparece por extenso. */
export function KmtakWordmark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 1200 360" className={className} fill="currentColor" role="img" aria-label="KM-TAK">
      <path d={EAGLE_PATH} />
      <path d="M407 144 H429 V184 L467 144 H496 L452 190 L499 250 H469 L436 207 L429 215 V250 H407 Z" />
      <path d="M513 250 V144 H538 L576 197 L614 144 H639 V250 H616 V180 L577 231 H574 L536 180 V250 Z" />
      <path d="M655 144 H755 V166 H717 V250 H693 V166 H655 Z" />
      <path
        d="M783 250 H756 L805 144 H831 L880 250 H853 L843 226 H793 Z M801 206 H835 L818 166 Z"
        fillRule="evenodd"
      />
      <path d="M896 144 H920 V185 L959 144 H990 L946 190 L994 250 H964 L929 207 L920 216 V250 H896 Z" />
    </svg>
  );
}
