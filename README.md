# KMSQUAD

Rastreamento de squad para airsoft sobre rádios Meshtastic. Veja [CLAUDE.md](CLAUDE.md) para o escopo completo do projeto e [docs/decisoes.md](docs/decisoes.md) para decisões técnicas.

**Fase atual: Fase 1 — prova de conceito.**

## Rodando localmente

```bash
npm install
npm run dev
```

## Publicando

Push para `main` publica automaticamente no GitHub Pages via `.github/workflows/deploy.yml`.

## Stack

- Vite + React + TypeScript
- [`@meshtastic/core`](https://www.npmjs.com/package/@meshtastic/core) + [`@meshtastic/transport-web-bluetooth`](https://www.npmjs.com/package/@meshtastic/transport-web-bluetooth) para falar com os rádios via Web Bluetooth
- No iPhone, só funciona dentro do navegador [Bluefy](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055) (Safari/Chrome iOS não suportam Web Bluetooth)

Licença: GPL-3.0 (as bibliotecas do Meshtastic são GPL-3).
