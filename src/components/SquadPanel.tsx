import { useState } from "react";
import QRCode from "qrcode";
import type { MeshState } from "../meshtastic/connection";
import { decodeChannelUrl } from "../meshtastic/channelUrl";
import { BRAZIL_REGION } from "../meshtastic/format";

interface Props {
  state: MeshState;
  createSquad: (name: string) => Promise<string>;
  joinSquad: (url: string) => Promise<string>;
}

type Mode = "fechado" | "criar" | "entrar";

export function SquadPanel({ state, createSquad, joinSquad }: Props) {
  const [mode, setMode] = useState<Mode>("fechado");
  const [name, setName] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [resultUrl, setResultUrl] = useState<string>();
  const [qrDataUrl, setQrDataUrl] = useState<string>();
  const [joinPreviewName, setJoinPreviewName] = useState<string>();
  const [joinPreviewRegionOk, setJoinPreviewRegionOk] = useState<boolean>();
  const [copied, setCopied] = useState(false);

  const currentChannelName = state.channels.get(0)?.settings?.name || undefined;

  async function handleCreate() {
    if (!name.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      const url = await createSquad(name.trim());
      setResultUrl(url);
      setQrDataUrl(await QRCode.toDataURL(url, { margin: 1, width: 240 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!resultUrl) return;
    try {
      await navigator.clipboard.writeText(resultUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não consegui copiar sozinho — toque e segure no link acima pra copiar manualmente.");
    }
  }

  function handleTestLocally() {
    if (!resultUrl) return;
    setMode("entrar");
    setResultUrl(undefined);
    handlePreviewJoin(resultUrl);
  }

  function handlePreviewJoin(value: string) {
    setJoinUrl(value);
    setError(undefined);
    setJoinPreviewName(undefined);
    setJoinPreviewRegionOk(undefined);
    if (!value.trim()) return;
    try {
      const channelSet = decodeChannelUrl(value);
      const settings = channelSet.settings[0];
      setJoinPreviewName(settings?.name || "(sem nome)");
      setJoinPreviewRegionOk(
        channelSet.loraConfig?.region === undefined || channelSet.loraConfig.region === BRAZIL_REGION,
      );
    } catch {
      setError("Esse link não parece ser um link de squad do Meshtastic válido.");
    }
  }

  async function handleJoin() {
    setBusy(true);
    setError(undefined);
    try {
      const squadName = await joinSquad(joinUrl);
      setResultUrl(undefined);
      setJoinUrl("");
      setJoinPreviewName(undefined);
      setMode("fechado");
      setError(undefined);
      // feedback rápido reaproveitando o campo de erro (estilo neutro seria melhor, mas não há outro aviso disponível aqui)
      setError(`Entrou no squad "${squadName}". O rádio pode reiniciar sozinho — reconecte se a tela voltar pra "desconectado".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (mode === "fechado") {
    return (
      <div className="panel">
        <h2>Squad</h2>
        <div className="row">
          <span className="label">Canal atual</span>
          <span className="value">{currentChannelName || "—"}</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="primary" onClick={() => setMode("criar")}>
            Criar squad
          </button>
          <button className="secondary" onClick={() => setMode("entrar")}>
            Entrar com link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>{mode === "criar" ? "Criar squad" : "Entrar num squad"}</h2>
      <div className="error-box" style={{ borderColor: "var(--volt)", color: "var(--volt)" }}>
        Isso substitui o canal principal do rádio (o que estiver configurado
        agora, inclusive um squad anterior). Quem tiver o link/QR novo entra
        no squad; quem não tiver, não vê nada.
      </div>

      {mode === "criar" && !resultUrl && (
        <>
          <input
            type="text"
            placeholder="Nome do squad (ex.: ALFA)"
            maxLength={11}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="primary" disabled={!name.trim() || busy} onClick={handleCreate}>
            {busy ? "Criando…" : "Criar e gravar no rádio"}
          </button>
        </>
      )}

      {mode === "criar" && resultUrl && (
        <>
          <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
            Squad criado. Mande este link ou QR pros outros jogadores — eles
            colam o link em "Entrar com link" no app deles.
          </p>
          {qrDataUrl && (
            <div style={{ textAlign: "center", margin: "12px 0" }}>
              <img src={qrDataUrl} alt="QR code do squad" style={{ borderRadius: 6 }} />
            </div>
          )}
          <input type="text" readOnly value={resultUrl} onFocus={(e) => e.currentTarget.select()} />
          <button className="primary" onClick={handleCopy} style={{ marginTop: 10 }}>
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <button className="secondary" onClick={handleTestLocally} style={{ marginTop: 10 }}>
            Testar "entrar" agora (só pra conferir, com 1 rádio)
          </button>
        </>
      )}

      {mode === "entrar" && (
        <>
          <input
            type="text"
            placeholder="Cole o link do squad aqui"
            value={joinUrl}
            onChange={(e) => handlePreviewJoin(e.target.value)}
          />
          {joinPreviewName && (
            <div className="row">
              <span className="label">Squad</span>
              <span className="value">{joinPreviewName}</span>
            </div>
          )}
          {joinPreviewRegionOk === false && (
            <div className="error-box">
              Esse link configura o rádio pra uma região diferente de Brasil
              (BR_902). Confirme com quem te mandou antes de continuar.
            </div>
          )}
          <button className="primary" disabled={!joinPreviewName || busy} onClick={handleJoin}>
            {busy ? "Entrando…" : "Entrar e gravar no rádio"}
          </button>
        </>
      )}

      {error && <div className="error-box">{error}</div>}

      <div style={{ marginTop: 12 }}>
        <button
          className="secondary"
          onClick={() => {
            setMode("fechado");
            setResultUrl(undefined);
            setError(undefined);
            setJoinUrl("");
            setName("");
          }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
