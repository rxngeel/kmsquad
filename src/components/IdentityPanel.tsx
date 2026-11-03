import { useState } from "react";
import type { MeshState } from "../meshtastic/connection";

interface Props {
  state: MeshState;
  setIdentity: (longName: string, shortName: string) => Promise<void>;
}

export function IdentityPanel({ state, setIdentity }: Props) {
  const [longName, setLongName] = useState(state.ownUser?.longName ?? "");
  const [shortName, setShortName] = useState(state.ownUser?.shortName ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSave() {
    setBusy(true);
    setError(undefined);
    setSaved(false);
    try {
      await setIdentity(longName.trim(), shortName.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2>Identidade</h2>
      <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
        O numeral/callsign é o que aparece no marcador do mapa (ex.: "01").
      </p>
      <input
        type="text"
        placeholder="Nome (ex.: Ran)"
        maxLength={24}
        value={longName}
        onChange={(e) => setLongName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Numeral/callsign (ex.: 01)"
        maxLength={4}
        value={shortName}
        onChange={(e) => setShortName(e.target.value)}
      />
      <button className="primary" disabled={busy || (!longName.trim() && !shortName.trim())} onClick={handleSave}>
        {busy ? "Gravando…" : saved ? "Gravado!" : "Gravar identidade"}
      </button>
      {error && <div className="error-box">{error}</div>}
    </div>
  );
}
