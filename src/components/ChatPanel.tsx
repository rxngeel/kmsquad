import { useState } from "react";
import type { MeshState } from "../meshtastic/connection";

interface Props {
  state: MeshState;
  sendTestMessage: (text: string) => Promise<void>;
}

/** Chat de texto do squad — viaja na porta de mensagem padrão do Meshtastic, no canal do squad. */
export function ChatPanel({ state, sendTestMessage }: Props) {
  const [text, setText] = useState("");

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    await sendTestMessage(trimmed);
    setText("");
  }

  return (
    <div className="panel">
      <h2>Mensagens</h2>
      <div className="msg-list">
        {state.messages.length === 0 && (
          <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
            Nenhuma mensagem ainda.
          </p>
        )}
        {state.messages.map((msg) => (
          <div key={msg.id} className={`msg ${msg.direction}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <input
        type="text"
        placeholder="Digite uma mensagem…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
      />
      <button className="primary" onClick={handleSend} disabled={!text.trim()}>
        Enviar
      </button>
    </div>
  );
}
