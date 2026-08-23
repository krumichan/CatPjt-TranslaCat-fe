import { getVoiceWebSocketUrl } from "@/features/voice/stream/voiceWebSocketUrl";
import type {
    VoiceChannel,
    VoiceClientChannelState,
    VoicePublicEvent,
} from "@/types/voice";

const READY_TIMEOUT_MS = 10_000;
const MAX_RECONNECT_ATTEMPTS = 4;
const RECONNECT_BASE_DELAY_MS = 400;
const MAX_CLIENT_BUFFERED_BYTES = 512 * 1024;

type TicketProvider = () => Promise<string>;

type VoiceChannelSocketOptions = {
    sessionId: string;
    channel: VoiceChannel;
    ticketProvider: TicketProvider;
    onEvent: (event: VoicePublicEvent) => void;
    onStateChange: (state: VoiceClientChannelState) => void;
};

export class VoiceChannelSocket {
    private readonly sessionId: string;
    private readonly channel: VoiceChannel;
    private readonly ticketProvider: TicketProvider;
    private readonly onEvent: (event: VoicePublicEvent) => void;
    private readonly onStateChange: (state: VoiceClientChannelState) => void;

    private socket: WebSocket | null = null;
    private allowReconnect = true;
    private intentionallyClosed = false;
    private reconnectAttempt = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private bufferedAmountTimer: ReturnType<typeof setTimeout> | null = null;
    private ready = false;
    private seenEventIds = new Set<string>();
    private seenEventOrder: string[] = [];

    constructor(options: VoiceChannelSocketOptions) {
        this.sessionId = options.sessionId;
        this.channel = options.channel;
        this.ticketProvider = options.ticketProvider;
        this.onEvent = options.onEvent;
        this.onStateChange = options.onStateChange;
    }

    async connect(): Promise<void> {
        this.allowReconnect = true;
        this.intentionallyClosed = false;
        this.reconnectAttempt = 0;
        await this.openSocket("CONNECTING");
    }

    sendAudio(frame: ArrayBuffer): boolean {
        const socket = this.socket;
        if (!socket || socket.readyState !== WebSocket.OPEN || !this.ready) {
            return false;
        }

        if (socket.bufferedAmount >= MAX_CLIENT_BUFFERED_BYTES) {
            this.setState("BACKPRESSURED");
            this.scheduleBufferedAmountCheck();
            return false;
        }

        socket.send(frame);
        return true;
    }

    sendControl(type: "STREAM_FLUSH" | "STREAM_CLOSE", reason?: string): void {
        const socket = this.socket;
        if (!socket || socket.readyState !== WebSocket.OPEN) return;

        socket.send(
            JSON.stringify({
                type,
                ...(reason ? { reason } : {}),
            }),
        );
    }

    disableReconnect(): void {
        this.allowReconnect = false;
        this.clearReconnectTimer();
        this.clearBufferedAmountTimer();
    }

    closeLocal(): void {
        this.disableReconnect();
        this.intentionallyClosed = true;
        this.ready = false;

        const socket = this.socket;
        this.socket = null;
        if (socket && socket.readyState < WebSocket.CLOSING) {
            socket.close(1000, "CLIENT_CLEANUP");
        }
        this.setState("DISCONNECTED");
    }

    private async openSocket(
        state: "CONNECTING" | "RECONNECTING",
    ): Promise<void> {
        this.setState(state);
        this.ready = false;

        const ticket = await this.ticketProvider();
        if (!this.allowReconnect && state === "RECONNECTING") return;

        const url = getVoiceWebSocketUrl(this.sessionId, this.channel, ticket);

        await new Promise<void>((resolve, reject) => {
            const socket = new WebSocket(url);
            socket.binaryType = "arraybuffer";
            this.socket = socket;
            let settled = false;

            const timeout = setTimeout(() => {
                if (settled) return;
                settled = true;
                socket.close(4000, "STREAM_READY_TIMEOUT");
                reject(new Error("Voice STREAM_READY timeout."));
            }, READY_TIMEOUT_MS);

            const settleReady = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                this.ready = true;
                this.reconnectAttempt = 0;
                this.setState("STREAMING");
                resolve();
            };

            socket.onmessage = (message) => {
                if (typeof message.data !== "string") return;

                const event = this.parseEvent(message.data);
                if (!event || this.isDuplicate(event.eventId)) return;

                if (event.type === "STREAM_READY") {
                    settleReady();
                } else if (event.type === "BACKPRESSURE") {
                    this.setState("BACKPRESSURED");
                }

                this.onEvent(event);
            };

            socket.onerror = () => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    reject(new Error("Voice WebSocket connection failed."));
                }
            };

            socket.onclose = () => {
                clearTimeout(timeout);
                this.ready = false;

                if (!settled) {
                    settled = true;
                    reject(new Error("Voice WebSocket closed before STREAM_READY."));
                    return;
                }

                if (this.intentionallyClosed || !this.allowReconnect) {
                    this.setState("DISCONNECTED");
                    return;
                }

                this.scheduleReconnect();
            };
        });
    }

    private scheduleReconnect(): void {
        if (!this.allowReconnect || this.reconnectTimer) return;

        if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
            this.setState("ERROR");
            return;
        }

        const delay = Math.min(
            RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempt,
            4_000,
        );
        this.reconnectAttempt += 1;
        this.setState("RECONNECTING");

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.openSocket("RECONNECTING").catch(() => {
                this.scheduleReconnect();
            });
        }, delay);
    }


    private scheduleBufferedAmountCheck(): void {
        if (this.bufferedAmountTimer) return;

        this.bufferedAmountTimer = setTimeout(() => {
            this.bufferedAmountTimer = null;
            const socket = this.socket;
            if (!socket || socket.readyState !== WebSocket.OPEN || !this.ready) {
                return;
            }

            if (socket.bufferedAmount < MAX_CLIENT_BUFFERED_BYTES / 2) {
                this.setState("STREAMING");
                return;
            }
            this.scheduleBufferedAmountCheck();
        }, 100);
    }

    private clearBufferedAmountTimer(): void {
        if (!this.bufferedAmountTimer) return;
        clearTimeout(this.bufferedAmountTimer);
        this.bufferedAmountTimer = null;
    }

    private clearReconnectTimer(): void {
        if (!this.reconnectTimer) return;
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
    }

    private parseEvent(raw: string): VoicePublicEvent | null {
        try {
            const parsed = JSON.parse(raw) as VoicePublicEvent;
            if (!parsed || typeof parsed.type !== "string") return null;
            if (parsed.sessionId && parsed.sessionId !== this.sessionId) return null;
            if (parsed.channel && parsed.channel !== this.channel) return null;
            return parsed;
        } catch {
            return null;
        }
    }

    private isDuplicate(eventId?: string): boolean {
        if (!eventId) return false;
        if (this.seenEventIds.has(eventId)) return true;

        this.seenEventIds.add(eventId);
        this.seenEventOrder.push(eventId);
        if (this.seenEventOrder.length > 1_000) {
            const oldest = this.seenEventOrder.shift();
            if (oldest) this.seenEventIds.delete(oldest);
        }
        return false;
    }

    private setState(state: VoiceClientChannelState): void {
        this.onStateChange(state);
    }
}
