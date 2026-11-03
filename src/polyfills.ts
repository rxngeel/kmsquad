/**
 * @meshtastic/core arrasta o tslog, que detecta o runtime acessando `process`
 * direto (sem `typeof` guard). No navegador isso não existe, então criamos um
 * objeto mínimo antes de qualquer outro import rodar.
 */
const target = globalThis as typeof globalThis & { process?: Record<string, unknown> };

if (typeof target.process === "undefined") {
  target.process = {
    env: {},
    version: undefined,
    cwd: () => "",
  };
}
