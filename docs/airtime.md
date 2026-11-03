# Airtime — preset, intervalo de posição e tamanho de pacote

Números calculados pra orientar as escolhas padrão do app. Fonte dos
parâmetros de rádio (banda, fator de espalhamento, taxa de codificação):
[`MeshRadio.h`](https://github.com/meshtastic/firmware/blob/master/src/mesh/MeshRadio.h)
do firmware oficial (`modemPresetToParams`), região não-wide (902–928 MHz,
não os 2.4 GHz). Tempo de ar calculado com a fórmula padrão da Semtech
(AN1200.13), preâmbulo de 8 símbolos, CRC ligado, cabeçalho explícito —
mesma fórmula que o firmware usa internamente.

## Tempo de ar por preset (ida, 1 pacote)

| Preset | Banda | SF | CR | ~20 bytes | ~60 bytes (posição) | ~120 bytes |
|---|---|---|---|---|---|---|
| SHORT_TURBO | 500 kHz | 7 | 4/5 | 14 ms | 28 ms | 50 ms |
| SHORT_FAST | 250 kHz | 7 | 4/5 | 28 ms | 56 ms | 100 ms |
| SHORT_SLOW | 250 kHz | 8 | 4/5 | 52 ms | 103 ms | 180 ms |
| MEDIUM_FAST | 250 kHz | 9 | 4/5 | 93 ms | 185 ms | 318 ms |
| MEDIUM_SLOW | 250 kHz | 10 | 4/5 | 185 ms | 349 ms | 595 ms |
| **LONG_FAST** (padrão Meshtastic) | 250 kHz | 11 | 4/5 | 330 ms | 616 ms | 1067 ms |
| LONG_MODERATE | 125 kHz | 11 | 4/8 | 987 ms | 2167 ms | 3871 ms |
| LONG_SLOW | 125 kHz | 12 | 4/8 | 1712 ms | 3809 ms | 6955 ms |

"~60 bytes" é o tamanho aproximado de um pacote de posição do Meshtastic
(protobuf `Position` + cabeçalho/criptografia do `MeshPacket`) — a base pra
pensar no orçamento de airtime do squad na Fase 2. Preset maior de SF =
mais alcance e penetração, só que muito mais caro em tempo de ar — repara
que de LONG_FAST pra LONG_SLOW o custo mais que sextuplica pro mesmo pacote.

## Preset recomendado por tipo de campo

- **CQB pequeno (prédio, contêiner, mata fechada bem densa)**: **MEDIUM_FAST**.
  Alcance de LoRa já é curto o suficiente num CQB que SF mais alto (mais
  alcance) não ajuda muito, e o ganho em velocidade (~3,3x mais rápido que
  LONG_FAST pro mesmo pacote) permite atualizações de posição mais
  frequentes com os mesmos ~30 jogadores — importante quando todo mundo
  tá perto e a ação é rápida.
- **Mata / área aberta**: **LONG_FAST**. É o preset padrão do próprio
  Meshtastic — maior alcance prático pra cobrir uma área grande ou com
  vegetação no meio, e ainda é o mais usado pela comunidade (então
  qualquer rádio configurado "do jeito que vem" já fala a mesma língua,
  caso precise comparar/depurar depois).
- Os presets "LONG_MODERATE"/"LONG_SLOW" (ainda mais alcance, ainda mais
  lentos) só valem a pena pra distâncias bem maiores do que um jogo de
  airsoft costuma cobrir — não recomendado pro KMSQUAD por enquanto.

## Intervalo de posição ("envio inteligente")

O Meshtastic já tem embutido exatamente o que a Fase 2 pede — não precisa
reinventar: `position_broadcast_smart_enabled` manda a posição só quando o
jogador andou o suficiente, com um heartbeat fixo mais espaçado pra quem
tá parado.

Valores recomendados (o app vai gravar isso na tela de config do rádio):

- `position_broadcast_smart_enabled = true` — sempre ligado.
- `broadcast_smart_minimum_distance = 12` metros — dá pra notar o jogador
  se movendo mesmo em CQB, sem disparar posição a cada passo.
- `broadcast_smart_minimum_interval_secs = 20` segundos — nem o jogador
  mais ágil consegue lotar o canal sozinho correndo muito.
- `position_broadcast_secs = 300` (5 minutos) — heartbeat de quem tá
  parado/escondido. O padrão do Meshtastic é 15 minutos (900s); achamos
  muito pra um jogo onde "há quanto tempo essa posição foi vista" importa
  pra decisão tática. 5 min é um meio-termo entre "não deixar sumir do
  mapa" e "não gastar airtime à toa com gente parada".

### Conta de orçamento (pior caso, sem envio inteligente)

Se os 30 jogadores mandassem posição toda hora sem envio inteligente, em
LONG_FAST (~616 ms por pacote de 60 bytes) e considerando que cada pacote
costuma ser retransmitido ~1–2 vezes pelos vizinhos (inundação da mesh):
`30 × 0,616 s × ~1,5 ≈ 28 s` de tempo de ar só pra uma rodada onde todo
mundo manda uma vez. Pra manter a utilização do canal numa faixa saudável
(bem abaixo de 100% de ocupação, senão pacotes começam a colidir e se
perder), isso sozinho já pede um intervalo de vários minutos — é
exatamente por isso que o envio inteligente (só manda quem se moveu) é
obrigatório, não opcional, pros ~30 jogadores do projeto.

## Tamanho dos pacotes customizados (Fase 3)

Os pacotes binários próprios do KMSQUAD (status, marcador, direção —
`docs/protocolo.md`) ainda não existem; o protocolo deles vai ser definido
na Fase 3. Como referência de orçamento: mantendo cada pacote customizado
abaixo de ~20 bytes de payload (como a coluna "~20 bytes" da tabela acima),
mesmo em LONG_FAST um pacote desses custa ~330 ms — bem mais barato que
posição, então há folga pra status/marcador não competirem muito pelo
canal. Revisitar esse número quando o formato binário for definido.
