import { MeshDevice, Protobuf, Types } from "@meshtastic/core";
import { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";

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
        const existing = this.state.nodes.get(packet.from);
        if (existing) {
          const nodes = new Map(this.state.nodes);
          nodes.set(packet.from, { ...existing, position: packet.data });
          this.setState({ nodes });
        }
        this.log(`Posição recebida do nó #${packet.from}`);
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

  /** Modo V3: envia a posição do GPS do celular para o próprio rádio retransmitir. */
  async sendPhonePosition(latitude: number, longitude: number, altitude?: number): Promise<void> {
    if (!this.device) return;
    const { create } = await import("@bufbuild/protobuf");
    const position = create(Protobuf.Mesh.PositionSchema, {
      latitudeI: Math.round(latitude * 1e7),
      longitudeI: Math.round(longitude * 1e7),
      altitude: altitude ? Math.round(altitude) : undefined,
      time: Math.floor(Date.now() / 1000),
    });
    await this.device.setPosition(position);
    this.log(`Posição do celular enviada: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
  }

  disconnect(): void {
    this.device = null;
    this.setState({ ...createInitialState() });
  }

  getState(): MeshState {
    return this.state;
  }
}
