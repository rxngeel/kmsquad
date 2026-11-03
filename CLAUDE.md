# KMSQUAD

Rastreamento de squad para airsoft, inspirado no ATAK, rodando sobre rádios Meshtastic (Heltec LoRa32 V3/V4) e com foco em iPhone. Web app (PWA), sem custo de infraestrutura.

## Sobre o dono do projeto

Ran não é desenvolvedor. Ele testa, dá feedback e decide produto/design.

- Fale em português (pt-BR), direto, sem jargão desnecessário.
- Quando ele precisar fazer algo (instalar, rodar comando, configurar GitHub), dê o passo a passo exato, um comando por vez, dizendo o que esperar como resultado.
- Toda entrega deve terminar com: o link para testar e um checklist curto do que testar no campo.
- Não peça para ele editar código. Se algo quebrar, peça print, descrição ou o log da tela de debug do app.

## Objetivo

App para jogadores de airsoft no Brasil inteiro (não só um time). Cada squad usa um canal com senha, e só quem tem a credencial do canal vê as posições e marcações do squad.

## Restrições

- **Custo zero inicial.** Sem conta Apple Developer, sem servidor pago, sem Mac.
- **iOS first.** No iPhone o app roda no navegador **Bluefy** (gratuito, suporta Web Bluetooth). Safari e Chrome do iOS não suportam Web Bluetooth.
- Android e desktop: Chrome.
- Hospedagem: **GitHub Pages** (HTTPS obrigatório para Web Bluetooth).
- **100% offline em campo** depois de carregado (app e mapa).
- Jogos de 3 a 12 horas, até ~30 jogadores por área, de CQB pequeno a mata e área aberta.
- Uso principal: celular preso no braço ou no peito, olhadas rápidas, possivelmente de luva.
- Repositório aberto. As bibliotecas JS do Meshtastic são GPL-3, então o projeto segue GPL-3.

## Hardware

- Heltec V3 (sem GPS) e Heltec V4 (com GPS ligado), firmware Meshtastic mais recente.
- Rádios já configurados pelo Ran, mas nunca usados de verdade. Não assuma que a configuração está correta: a fase 1 inclui ler e mostrar a config atual.

### Duas fontes de posição (decisão importante)

1. **Rádio com GPS (V4)**: o próprio Heltec transmite a posição, com o celular bloqueado no bolso. **Esse é o modo recomendado para jogos longos.**
2. **GPS do celular (V3)**: o app lê a geolocalização e envia a posição para o rádio, que transmite na mesh. Só funciona com a página aberta e a tela acesa (limitação de web app no iOS).

O app deve detectar qual modo está ativo, mostrar isso claramente na tela e, no modo 2, usar a Wake Lock API (se o Bluefy suportar) e avisar o jogador para manter a tela acesa.

## Stack

- Vite + TypeScript + React.
- Bibliotecas oficiais JS do Meshtastic (core + transporte Web Bluetooth). **Verifique os nomes e versões atuais dos pacotes no repositório oficial antes de instalar**, porque eles foram reorganizados nos últimos tempos.
- Mapa: MapLibre GL ou Leaflet, com suporte a tiles offline (PMTiles ou cache em IndexedDB).
- PWA com service worker para funcionamento offline.
- Estado local em IndexedDB (squads salvos, marcadores, último estado conhecido dos jogadores).

Antes de fixar qualquer escolha de stack, confirme que funciona dentro do Bluefy. Se não funcionar, troque e explique o porquê.

## Rede e canais

- Cada squad é um canal Meshtastic com PSK aleatória forte (o "canal com senha").
- Entrar num squad: QR code ou link gerado pelo app (pode reaproveitar o formato de URL de canal do Meshtastic).
- Garantir precisão de posição máxima no canal do squad (o Meshtastic pode reduzir a precisão de posição por canal).
- Evitar que dados do squad saiam pelo canal público padrão.
- Região LoRa: confirme a opção correta para o Brasil no firmware atual e que ela respeita as faixas permitidas pela Anatel. Explique para o Ran o que foi escolhido.

### Airtime

Até 30 nós na mesma área. Calcule e documente:

- Preset de modem recomendado por tipo de campo (CQB vs mata/aberto).
- Intervalo de posição (com envio inteligente: só quando houver movimento relevante, e um heartbeat mais espaçado parado).
- Tamanho dos pacotes customizados.

Coloque esses números num arquivo `docs/airtime.md`.

## Pacotes customizados

Status, marcadores e direção vão em mensagens binárias compactas numa porta de app privada do Meshtastic (não em texto). Defina o formato em `docs/protocolo.md`, com versão no primeiro byte para permitir evolução. Verifique se a biblioteca JS permite enviar e receber nessa porta pelo Bluetooth.

## Funções

### Essenciais
- Mapa com a própria posição e a dos membros do squad.
- Cada jogador com callsign e numeral (ex.: "01 RAN").
- Indicador de idade da posição ("há 3 min"), com ícone esmaecendo quando ficar velha.
- Status do jogador: VIVO, HIT, MEDIC, RESPAWN. Troca em um toque.
- Marcadores: CONTATO (inimigo), OBJETIVO, PONTO DE ENCONTRO, PERIGO. Marcar contato deve ser o mais rápido possível (um toque segurando no mapa ou botão dedicado usando a direção da bússola).
- Bússola e direção para onde o jogador está virado, com opção de **desativar o compartilhamento da direção**. No iOS a bússola exige permissão do usuário (DeviceOrientationEvent); teste se funciona no Bluefy.
- Relógio e timer de jogo na tela principal.

### Depois
- Mensagens rápidas pré-definidas ("PRECISO DE APOIO", "AVANÇANDO", "RECUANDO").
- Distância e azimute até um marcador ou jogador.
- Histórico de rastro do jogo.

## Mapa offline

- Campo de referência para testes: **Airsoft Company** (Curitiba). Peça ao Ran a localização exata ou um pin do Google Maps.
- Fluxo: com internet, o jogador escolhe a área do campo e baixa os tiles; em campo, funciona sem sinal.
- Permitir importar uma imagem do campo (foto de drone ou satélite) e posicioná-la sobre o mapa como camada.
- Atenção à licença dos provedores de tiles, principalmente satélite. Use fontes que permitam cache offline e documente a escolha.

## Interface

Identidade KMS (Keep Moving Society):

- Base quase preta, acento **VOLT** (verde-limão, ~#C6EE00). Sempre chamar a cor de VOLT.
- Estética industrial/brutalista: grotesca em caixa alta, filetes finos, números grandes.
- Alvos de toque grandes (uso de luva), alto contraste, legível sob sol.
- Tela principal é o mapa, com status, relógio, timer e conexão do rádio sempre visíveis.
- Interface em português.
- Ter uma tela de debug escondida (para o Ran mandar print quando algo falhar): conexão BLE, config do rádio, último pacote recebido, nós vistos.

## Fases

### Fase 1: prova de conceito
Meta: validar Bluefy + Heltec + Meshtastic no iPhone.

- Página publicada no GitHub Pages.
- Botão "Conectar rádio" via Web Bluetooth.
- Mostrar a config atual do rádio (região, preset, canais, nome, GPS ativo ou não).
- Listar nós vistos com posição e horário da última atualização.
- Enviar a posição do GPS do celular para o rádio (modo V3).
- Enviar e receber uma mensagem de texto de teste.

Teste de aceitação: V3 conectado no iPhone pelo Bluefy e V4 ligado com GPS, um aparece na lista do outro com posição.

### Fase 2: mapa e squad
- Mapa com jogadores, callsign, numeral, idade da posição.
- Criar squad (canal com PSK) e entrar por QR/link.
- Configurar o rádio a partir do app (preset, região, canal do squad, intervalo de posição).

### Fase 3: funções de jogo
- Status, marcadores, bússola/direção, relógio, timer.
- Protocolo binário customizado.

### Fase 4: offline e campo
- PWA offline completa.
- Download de área do mapa e camada de imagem do campo.
- Teste de jogo longo (bateria, tela acesa, estabilidade do Bluetooth).

## Como trabalhar

- Uma fase por vez. Ao terminar, publique, mande o link e o checklist de teste, e espere o retorno do Ran antes da próxima.
- Publicação direto na `main`, sem pedir confirmação a cada vez: ao terminar uma correção ou entrega, leve pra `main` (o que dispara o deploy do GitHub Pages) sem abrir pull request nem esperar aprovação. Combinado com o Ran em 2026-11-03.
- Mantenha um `docs/decisoes.md` com cada decisão técnica relevante em uma linha, e o porquê.
- Se uma restrição deste documento se mostrar inviável na prática (ex.: algo não funciona no Bluefy), pare, explique em linguagem simples e proponha alternativas com custo e esforço de cada uma.
