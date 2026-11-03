import { useState } from "react";
import type { MeshState } from "../meshtastic/connection";
import type { PlayerStatusValue } from "../meshtastic/protocol";
import { nextStatus, statusBadgeClass, statusLabel } from "../meshtastic/format";

interface Props {
  state: MeshState;
  sendStatus: (status: PlayerStatusValue) => Promise<void>;
}

/** Botão flutuante único: mostra o status atual, cicla VIVO → SANGRANDO → MORTO a cada toque. */
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
    >
      {statusLabel(current)}
    </button>
  );
}
