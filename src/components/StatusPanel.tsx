import { useState } from "react";
import type { MeshState } from "../meshtastic/connection";
import { PlayerStatus, type PlayerStatusValue } from "../meshtastic/protocol";
import { statusBadgeClass, statusLabel } from "../meshtastic/format";

interface Props {
  state: MeshState;
  sendStatus: (status: PlayerStatusValue) => Promise<void>;
}

const OPTIONS: PlayerStatusValue[] = [
  PlayerStatus.VIVO,
  PlayerStatus.HIT,
  PlayerStatus.MEDIC,
  PlayerStatus.RESPAWN,
];

export function StatusPanel({ state, sendStatus }: Props) {
  const [busy, setBusy] = useState(false);
  const current = state.myNodeNum !== undefined ? state.playerStatus.get(state.myNodeNum) : undefined;

  async function handleTap(status: PlayerStatusValue) {
    setBusy(true);
    try {
      await sendStatus(status);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2>Status</h2>
      <div className="status-grid">
        {OPTIONS.map((status) => (
          <button
            key={status}
            disabled={busy}
            className={`status-btn status-btn--${statusBadgeClass(status)} ${
              current === status ? "status-btn--active" : ""
            }`}
            onClick={() => handleTap(status)}
          >
            {statusLabel(status)}
          </button>
        ))}
      </div>
    </div>
  );
}
