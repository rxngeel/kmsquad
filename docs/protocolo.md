# Protocolo binário do KMSQUAD

Status, marcadores e direção viajam como mensagens binárias compactas na
porta privada do Meshtastic (`PortNum.PRIVATE_APP = 256`), dentro do canal
do squad — não em texto, e não na porta pública de mensagens. Confirmado
que a lib (`@meshtastic/core`) permite mandar (`device.sendPacket(bytes,
PortNum.PRIVATE_APP, destino, canal)`) e receber (filtrando
`device.events.onMeshPacket` por `portnum === PRIVATE_APP`) nessa porta
pelo Web Bluetooth.

## Por que binário, não protobuf

O Meshtastic já usa protobuf pra tudo (posição, canal, config...), mas pra
mensagens tão pequenas (3 a 12 bytes) o overhead de um protobuf genérico
(tags, varints) não compensa frente a campos de tamanho fixo em posições
fixas — e um parser de poucas linhas é mais fácil de versionar e de
depurar lendo bytes crus na tela de debug.

## Formato geral

```
byte 0       versão do protocolo (começa em 1)
byte 1       tipo da mensagem (ver tabela)
bytes 2..N   dados específicos do tipo
```

- **Versão**: se um cliente receber uma versão maior que a que ele conhece,
  ele deve ignorar a mensagem (não travar, não tentar interpretar os bytes
  errado). Só sobe quando o formato de um tipo existente muda de um jeito
  incompatível.
- **Tipo desconhecido**: cliente deve ignorar silenciosamente (permite
  adicionar tipos novos sem quebrar clientes antigos do squad).
- Todos os campos multi-byte são **little-endian** (padrão da plataforma
  dos rádios Heltec/ESP32).
- Latitude/longitude usam a mesma codificação que o Meshtastic já usa pra
  posição: inteiro de 4 bytes = grau × 1e7 (mesma escala de
  `Position.latitude_i`/`longitude_i`).

## Tipos de mensagem

| Tipo (byte 1) | Nome | Tamanho total |
|---|---|---|
| `0x01` | STATUS | 3 bytes |
| `0x02` | MARKER | 12 bytes |
| `0x03` | DIRECTION | 3 bytes |
| `0x04` | REMOVE_MARKER | 3 bytes |

### `0x01` STATUS — status do jogador

```
byte 0   versão
byte 1   0x01 (STATUS)
byte 2   status: 0=VIVO, 1=SANGRANDO, 2=MORTO
```

Simplificado de 4 pra 3 estados (era VIVO/HIT/MEDIC/RESPAWN) — MEDIC e
RESPAWN não faziam sentido como status do próprio jogador; "sangrando"
cobre o período entre ser atingido e ser revivido ou "morrer", e "morto"
cobre o resto até o respawn. Botão flutuante único no HUD cicla entre os
três a cada toque (VIVO → SANGRANDO → MORTO → VIVO...).

Mandado quando o jogador toca pra trocar de status. O jogador (de quem é
o status) já vem no cabeçalho do pacote Meshtastic (`MeshPacket.from`),
não precisa repetir aqui.

### `0x02` MARKER — marcador no mapa

```
byte 0       versão
byte 1       0x02 (MARKER)
byte 2       tipo: 0=CONTATO, 1=OBJETIVO, 2=PONTO_DE_ENCONTRO, 3=PERIGO
byte 3       id do marcador (0–255, escolhido por quem cria — permite
             remover/atualizar esse marcador depois mandando um tipo
             futuro de "remover" com o mesmo id + autor)
bytes 4–7    latitude_i (int32 little-endian, grau × 1e7)
bytes 8–11   longitude_i (int32 little-endian, grau × 1e7)
```

O autor do marcador também vem do cabeçalho Meshtastic (`MeshPacket.from`).
CONTATO é o mais urgente — a UI deve permitir marcar com um toque/toque
longo, usando a posição atual do jogador (ou a direção da bússola, se
ligada) sem precisar abrir nenhum menu.

### `0x03` DIRECTION — direção/bússola

```
byte 0   versão
byte 1   0x03 (DIRECTION)
byte 2   heading: 0–255 representando 0°–360° (resolução de ~1,4°)
         heading_byte = round(graus_true_north * 256 / 360)
```

Só é mandado se o jogador tiver a bússola **ativada** (é opt-out, ver
Interface no `CLAUDE.md`). 1 byte é resolução suficiente pra desenhar uma
seta no mapa — não precisa de mais precisão que isso pro caso de uso.

### `0x04` REMOVE_MARKER — remover marcador

```
byte 0   versão
byte 1   0x04 (REMOVE_MARKER)
byte 2   id do marcador a remover (0–255)
```

O autor vem do cabeçalho Meshtastic (`MeshPacket.from`), igual ao MARKER —
por isso um cliente só aceita a remoção se o `from` do pacote bater com o
autor do marcador que ele tem guardado (a chave interna é `autor:id`).
Isso evita que outro jogador remova um marcador que não é dele (mesmo que
por acidente, mandando um id que coincide). Na UI, o botão "Remover" só
aparece pro próprio autor; marcador de outro jogador mostra as infos mas
sem opção de remover.

## Tamanho e airtime

Com esses tamanhos (3 a 12 bytes de payload), mesmo no preset mais lento
que o projeto recomenda (LONG_FAST) o custo fica entre a coluna "~20 bytes"
de `docs/airtime.md` (~330 ms) — bem mais barato que um pacote de posição
(~60 bytes, ~616 ms). Status e direção, que podem ser mandados com mais
frequência que posição (ex.: toda troca de status, toda vez que a bússola
muda o suficiente), cabem confortavelmente no orçamento.

## Evoluções futuras (não implementadas ainda)

- Mensagens rápidas pré-definidas ("PRECISO DE APOIO" etc. — fase
  "Depois" do roadmap): provavelmente um tipo novo `0x05` com 1 byte de
  índice pra uma lista fixa de frases.
