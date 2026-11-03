import { create } from "@bufbuild/protobuf";
import { MeshDevice, Protobuf, Types } from "@meshtastic/core";
import { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import { buildSquadChannelSettings, decodeChannelUrl, encodeChannelUrl } from "./channelUrl";
import { isPhoneGpsMode } from "./format";
import { decodeMessage, encodeStatus, type PlayerStatusValue } from "./protocol";

export type ConnectionStatus =
  | "desconectado"
  | "conectando"
  | "configurando"
  | "configurado"
  | "erro";

export interface MeshState {
  status: ConnectionStatus;
  errorMessage?: string;
  deviceName?: string;
  myNodeNum?: number;
  ownUser?: Protobuf.Mesh.User;
  loraConfig?: Protobuf.Config.Config_LoRaConfig;
  positionConfig?: Protobuf.Config.Config_PositionConfig;
  deviceConfig?: Protobuf.Config.Config_DeviceConfig;
  channels: Map<number, Protobuf.Channel.Channel>;
  nodes: Map<number, Protobuf.Mesh.NodeInfo>;
  playerStatus: Map<number, PlayerStatusValue>;
  messages: Array<{
    id: number;
    from: number;
    text: string;
    time: number;
    direction: "rx" | "tx";
  }>;
  debugLog: string[];
}

export function createInitialState(): MeshState {
  return {
    status: "desconectado",
    channels: new Map(),
    nodes: new Map(),
    playerStatus: new Map(),
    messages: [],
    debugLog: [],
  };
}

type Listener = (state: MeshState) => void;

/**
 * Wrapper fino sobre MeshDevice + TransportWebBluetooth que mantém um MeshState
 * imutável e notifica os listeners a cada mudança. Existe para que a Fase 2+
 * possa trocar o transporte (ex.: Web Serial) sem tocar nos componentes de UI.
 */
export class MeshtasticConnection {
  private device: MeshDevice | null = null;
  private state: MeshState = createInitialState();
  private listeners = new Set<Listener>();
  private messageIdCounter = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<MeshState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  private log(line: string) {
    const stamp = new Date().toLocaleTimeString("pt-BR");
    const entry = `${stamp}  ${line}`;
    const debugLog = [entry, ...this.state.debugLog].slice(0, 200);
    this.setState({ debugLog });
  }

  async connect(): Promise<void> {
    if (!navigator.bluetooth) {
      this.setState({
        status: "erro",
        errorMessage:
          "Este navegador não suporta Web Bluetooth. No iPhone, use o app Bluefy.",
      });
      return;
    }

    this.setState({ status: "conectando", errorMessage: undefined });
    this.log("Abrindo seletor de dispositivos Bluetooth…");

    try {
      const bleDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [TransportWebBluetooth.ServiceUuid] }],
      });
      this.log(`Dispositivo selecionado: ${bleDevice.name ?? "(sem nome)"}`);

      const transport = await TransportWebBluetooth.createFromDevice(bleDevice);
      const device = new MeshDevice(transport);
      // o logger interno (tslog) formata em modo "pretty" por padrão, e isso
      // chama util.formatWithOptions — que o polyfill de `util` do navegador
      // não implementa. "json" usa só JSON.stringify e evita esse crash.
      (device.log as unknown as { settings: { type: string } }).settings.type = "json";
      this.device = device;
      this.setState({ deviceName: bleDevice.name ?? "Rádio Meshtastic" });

      device.events.onDeviceStatus.subscribe((status) => {
        this.log(`Status do dispositivo: ${status}`);
        if (status === Types.DeviceStatusEnum.DeviceConfiguring) {
          this.setState({ status: "configurando" });
        } else if (status === Types.DeviceStatusEnum.DeviceConfigured) {
          this.setState({ status: "configurado" });
        }
      });

      device.events.onMyNodeInfo.subscribe((info) => {
        this.setState({ myNodeNum: info.myNodeNum });
        this.log(`Meu número de nó: ${info.myNodeNum}`);
      });

      device.events.onNodeInfoPacket.subscribe((nodeInfo) => {
        const nodes = new Map(this.state.nodes);
        nodes.set(nodeInfo.num, nodeInfo);
        this.setState({ nodes });
        if (nodeInfo.num === this.state.myNodeNum && nodeInfo.user) {
          this.setState({ ownUser: nodeInfo.user });
        }
        this.log(
          `Nó visto: ${nodeInfo.user?.longName ?? nodeInfo.num} (#${nodeInfo.num})`,
        );
      });

      device.events.onPositionPacket.subscribe((packet) => {
        const isSelf = packet.from === this.state.myNodeNum;
        if (isSelf && isPhoneGpsMode(this.state.positionConfig?.gpsMode, this.state.ownUser?.hwModel)) {
          // Em modo celular, a posição de verdade é a que o app manda em
          // sendPhonePosition. O que o próprio rádio relata sobre si mesmo
          // aqui pode vir impreciso (ex.: canal reduzindo a precisão, ou o
          // rádio tentando ler um GPS que esse modelo nem tem) — por isso
          // ignoramos esse eco pra não sobrescrever a posição certa.
          this.log(`Posição própria ignorada (eco do rádio, modo celular está ativo)`);
          return;
        }

        const existing = this.state.nodes.get(packet.from);
        const nodes = new Map(this.state.nodes);
        nodes.set(packet.from, {
          ...(existing ?? create(Protobuf.Mesh.NodeInfoSchema, { num: packet.from })),
          position: packet.data,
        });
        this.setState({ nodes });

        const lat = packet.data.latitudeI !== undefined ? (packet.data.latitudeI / 1e7).toFixed(5) : "?";
        const lon = packet.data.longitudeI !== undefined ? (packet.data.longitudeI / 1e7).toFixed(5) : "?";
        this.log(
          `Posição recebida do nó #${packet.from}: ${lat}, ${lon} (precisão: ${packet.data.precisionBits ?? "?"} bits)`,
        );
      });

      device.events.onConfigPacket.subscribe((config) => {
        switch (config.payloadVariant.case) {
          case "lora":
            this.setState({ loraConfig: config.payloadVariant.value });
            this.log("Config LoRa recebida");
            break;
          case "position":
            this.setState({ positionConfig: config.payloadVariant.value });
            this.log("Config de posição recebida");
            break;
          case "device":
            this.setState({ deviceConfig: config.payloadVariant.value });
            this.log("Config do dispositivo recebida");
            break;
        }
      });

      device.events.onChannelPacket.subscribe((channel) => {
        const channels = new Map(this.state.channels);
        channels.set(channel.index, channel);
        this.setState({ channels });
        this.log(
          `Canal ${channel.index}: ${channel.settings?.name || "(sem nome)"}`,
        );
      });

      device.events.onMessagePacket.subscribe((packet) => {
        const text = packet.data;
        this.messageIdCounter += 1;
        this.setState({
          messages: [
            ...this.state.messages,
            {
              id: this.messageIdCounter,
              from: packet.from,
              text,
              time: Date.now(),
              direction: "rx",
            },
          ],
        });
        this.log(`Mensagem recebida de #${packet.from}: ${text}`);
      });

      device.events.onLogRecord.subscribe((record) => {
        this.log(`[rádio] ${record.message}`);
      });

      // Status/marcador/direção do K-TAK viajam na porta privada do
      // Meshtastic, fora dos eventos "de fábrica" acima — ver docs/protocolo.md.
      device.events.onMeshPacket.subscribe((packet) => {
        if (packet.payloadVariant.case !== "decoded") return;
        const data = packet.payloadVariant.value;
        if (data.portnum !== Protobuf.Portnums.PortNum.PRIVATE_APP) return;

        const decoded = decodeMessage(data.payload);
        if (!decoded) {
          this.log(`[protocolo] pacote de #${packet.from} ignorado (versão futura ou tamanho inválido)`);
          return;
        }

        switch (decoded.type) {
          case "status": {
            const playerStatus = new Map(this.state.playerStatus);
            playerStatus.set(packet.from, decoded.status);
            this.setState({ playerStatus });
            this.log(`Status de #${packet.from}: ${decoded.status}`);
            break;
          }
          case "marker":
            this.log(`[protocolo] marcador de #${packet.from} recebido (ainda sem UI pra mostrar)`);
            break;
          case "direction":
            this.log(`[protocolo] direção de #${packet.from}: ${decoded.headingDegrees.toFixed(0)}°`);
            break;
          case "desconhecido":
            this.log(`[protocolo] tipo de mensagem desconhecido (0x${decoded.messageType.toString(16)}) de #${packet.from}`);
            break;
        }
      });

      await device.configure();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log(`Erro: ${message}`);
      this.setState({ status: "erro", errorMessage: message });
    }
  }

  async sendTestMessage(text: string): Promise<void> {
    if (!this.device) return;
    this.messageIdCounter += 1;
    this.setState({
      messages: [
        ...this.state.messages,
        {
          id: this.messageIdCounter,
          from: this.state.myNodeNum ?? 0,
          text,
          time: Date.now(),
          direction: "tx",
        },
      ],
    });
    await this.device.sendText(text);
    this.log(`Mensagem de teste enviada: ${text}`);
  }

  /** Troca o próprio status (VIVO/HIT/MEDIC/RESPAWN) e avisa o squad. */
  async sendStatus(status: PlayerStatusValue): Promise<void> {
    if (!this.device) return;
    const bytes = encodeStatus(status);
    await this.device.sendPacket(bytes, Protobuf.Portnums.PortNum.PRIVATE_APP, "broadcast", 0);

    if (this.state.myNodeNum !== undefined) {
      const playerStatus = new Map(this.state.playerStatus);
      playerStatus.set(this.state.myNodeNum, status);
      this.setState({ playerStatus });
    }
    this.log(`Status alterado para ${status}.`);
  }

  /** Modo V3: envia a posição do GPS do celular para o próprio rádio retransmitir. */
  async sendPhonePosition(latitude: number, longitude: number, altitude?: number): Promise<void> {
    if (!this.device) return;
    const position = create(Protobuf.Mesh.PositionSchema, {
      latitudeI: Math.round(latitude * 1e7),
      longitudeI: Math.round(longitude * 1e7),
      altitude: altitude ? Math.round(altitude) : undefined,
      time: Math.floor(Date.now() / 1000),
    });
    await this.device.setPosition(position);

    // Atualiza o próprio nó no mapa imediatamente, sem esperar o rádio
    // retransmitir a posição de volta pela mesh (isso pode demorar).
    if (this.state.myNodeNum !== undefined) {
      const nodes = new Map(this.state.nodes);
      const existing = nodes.get(this.state.myNodeNum);
      nodes.set(this.state.myNodeNum, {
        ...(existing ?? create(Protobuf.Mesh.NodeInfoSchema, { num: this.state.myNodeNum })),
        position,
      });
      this.setState({ nodes });
    }

    this.log(`Posição do celular enviada: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
  }

  /**
   * Cria um squad novo: substitui o canal principal (índice 0) do rádio por
   * um canal com PSK aleatória forte e precisão de posição máxima. Retorna
   * o link pra compartilhar (mesmo formato de QR/link do app oficial).
   */
  async createSquad(name: string): Promise<string> {
    if (!this.device) throw new Error("Rádio não conectado.");
    const settings = buildSquadChannelSettings(name);
    const channel = create(Protobuf.Channel.ChannelSchema, {
      index: 0,
      role: Protobuf.Channel.Channel_Role.PRIMARY,
      settings,
    });
    await this.device.setChannel(channel);
    this.log(`Squad "${name}" criado — canal principal do rádio substituído.`);

    // Atualiza a tela na hora — o rádio pode demorar (ou só confirmar depois
    // de reconectar) pra mandar o canal novo de volta pela mesh.
    const channels = new Map(this.state.channels);
    channels.set(0, channel);
    this.setState({ channels });

    const channelSet = create(Protobuf.AppOnly.ChannelSetSchema, {
      settings: [settings],
      loraConfig: this.state.loraConfig,
    });
    return encodeChannelUrl(channelSet);
  }

  /** Entra num squad a partir de um link/QR: grava o canal (e a config LoRa, se vier no link) no rádio. */
  async joinSquad(url: string): Promise<string> {
    if (!this.device) throw new Error("Rádio não conectado.");
    const channelSet = decodeChannelUrl(url);
    const settings = channelSet.settings[0];
    if (!settings) throw new Error("Esse link não tem nenhum canal dentro.");

    const channel = create(Protobuf.Channel.ChannelSchema, {
      index: 0,
      role: Protobuf.Channel.Channel_Role.PRIMARY,
      settings,
    });
    await this.device.setChannel(channel);

    const channels = new Map(this.state.channels);
    channels.set(0, channel);
    this.setState({ channels });

    if (channelSet.loraConfig) {
      const config = create(Protobuf.Config.ConfigSchema, {
        payloadVariant: { case: "lora", value: channelSet.loraConfig },
      });
      await this.device.setConfig(config);
      this.setState({ loraConfig: channelSet.loraConfig });
    }

    const label = settings.name || "(sem nome)";
    this.log(`Entrou no squad "${label}" — canal principal do rádio substituído.`);
    return label;
  }

  /** Grava região e/ou preset de modem, preservando o resto da config LoRa atual. */
  async setLoraSettings(patch: {
    region?: Protobuf.Config.Config_LoRaConfig_RegionCode;
    modemPreset?: Protobuf.Config.Config_LoRaConfig_ModemPreset;
  }): Promise<void> {
    if (!this.device) throw new Error("Rádio não conectado.");
    const loraConfig = this.state.loraConfig
      ? create(Protobuf.Config.Config_LoRaConfigSchema, this.state.loraConfig)
      : create(Protobuf.Config.Config_LoRaConfigSchema, {});
    Object.assign(loraConfig, patch, { usePreset: true }); // sem usePreset o rádio ignora modemPreset e usa bandwidth/SF/CR manuais
    const config = create(Protobuf.Config.ConfigSchema, {
      payloadVariant: { case: "lora", value: loraConfig },
    });
    await this.device.setConfig(config);
    this.setState({ loraConfig });
    this.log("Config LoRa (região/preset) atualizada.");
  }

  /** Grava o intervalo de posição ("envio inteligente"), preservando o resto da config de posição atual. */
  async setPositionSettings(patch: {
    positionBroadcastSecs?: number;
    broadcastSmartMinimumDistance?: number;
    broadcastSmartMinimumIntervalSecs?: number;
  }): Promise<void> {
    if (!this.device) throw new Error("Rádio não conectado.");
    const positionConfig = this.state.positionConfig
      ? create(Protobuf.Config.Config_PositionConfigSchema, this.state.positionConfig)
      : create(Protobuf.Config.Config_PositionConfigSchema, {});
    Object.assign(positionConfig, patch, { positionBroadcastSmartEnabled: true });
    const config = create(Protobuf.Config.ConfigSchema, {
      payloadVariant: { case: "position", value: positionConfig },
    });
    await this.device.setConfig(config);
    this.setState({ positionConfig });
    this.log("Intervalo de posição atualizado.");
  }

  /** Grava nome e numeral/callsign do jogador — é o que aparece pros outros (lista de nós, marcador no mapa). */
  async setIdentity(longName: string, shortName: string): Promise<void> {
    if (!this.device) throw new Error("Rádio não conectado.");
    const owner = this.state.ownUser
      ? create(Protobuf.Mesh.UserSchema, this.state.ownUser)
      : create(Protobuf.Mesh.UserSchema, {});
    Object.assign(owner, { longName, shortName });
    await this.device.setOwner(owner);
    this.setState({ ownUser: owner });

    // Atualiza o próprio nó na hora — senão o marcador no mapa só mostraria
    // o nome novo depois de um round-trip pela mesh.
    if (this.state.myNodeNum !== undefined) {
      const existing = this.state.nodes.get(this.state.myNodeNum);
      const nodes = new Map(this.state.nodes);
      nodes.set(this.state.myNodeNum, {
        ...(existing ?? create(Protobuf.Mesh.NodeInfoSchema, { num: this.state.myNodeNum })),
        user: owner,
      });
      this.setState({ nodes });
    }

    this.log(`Identidade atualizada: "${longName}" / "${shortName}".`);
  }

  disconnect(): void {
    this.device = null;
    this.setState({ ...createInitialState() });
  }

  getState(): MeshState {
    return this.state;
  }
}
