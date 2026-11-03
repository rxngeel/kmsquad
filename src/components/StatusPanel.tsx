import { useState } from "react";
import type { MeshState } from "../meshtastic/connection";
import { PlayerStatus, type PlayerStatusValue } from "../meshtastic/protocol";
import { nextStatus, statusBadgeClass, statusLabel } from "../meshtastic/format";

interface Props {
  state: MeshState;
  sendStatus: (status: PlayerStatusValue) => Promise<void>;
}

function StatusIcon({ status }: { status: PlayerStatusValue | undefined }) {
  switch (status) {
    case PlayerStatus.SANGRANDO:
      // gota de sangue
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M12 2c-4 5.5-7 9.2-7 12.5A7 7 0 0 0 12 22a7 7 0 0 0 7-7.5C19 11.2 16 7.5 12 2z" />
        </svg>
      );
    case PlayerStatus.MORTO:
      // caveira simplificada
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 5.1 3 6.5V19a1 1 0 0 0 1 1h1v2h2v-2h2v2h2v-2h1a1 1 0 0 0 1-1v-2.5c1.5-1.4 3-3.5 3-6.5a8 8 0 0 0-8-8Z" />
          <circle cx="9" cy="10" r="1.6" fill="#0a0a0a" />
          <circle cx="15" cy="10" r="1.6" fill="#0a0a0a" />
        </svg>
      );
    default:
      // cruz — vivo/normal
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M10 2h4v8h8v4h-8v8h-4v-8H2v-4h8V2Z" />
        </svg>
      );
  }
}

/** Botão flutuante único (ícone) — cicla VIVO → SANGRANDO → MORTO a cada toque. */
export function StatusPanel({ state, sendStatus }: Props) {
  const [busy, setBusy] = useState(false);
  const current = state.myNodeNum !== undefined ? state.playerStatus.get(state.myNodeNum) : undefined;

  async function handleTap() {
    if (busy) return;
    setBusy(true);
    try {
      await sendStatus(nextStatus(current));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`status-fab status-fab--${statusBadgeClass(current)}`}
      disabled={busy}
      onClick={handleTap}
      aria-label={`Status: ${statusLabel(current)}. Toque pra trocar.`}
      title={statusLabel(current)}
    >
      <StatusIcon status={current} />
    </button>
  );
}
