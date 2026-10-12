import { getVoiceWebSocketUrl } from "@/features/voice/stream/voiceWebSocketUrl";
import type {
    VoiceChannel,
    VoiceClientChannelState,
    VoicePublicEvent,
} from "@/types/voice";

const READY_TIMEOUT_MS = 10_000;
const MAX_RECONNECT_ATTEMPTS = 4;
const RECONNECT_BASE_DELAY_MS = 400;
const STABLE_CONNECTION_MS = 30_000;
const MAX_CLIENT_BUFFERED_BYTES = 512 * 1024;
const GRACEFUL_CLOSE_TIMEOUT_MS = 30_000;

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
    private terminalError = false;
    private reconnectAttempt = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private bufferedAmountTimer: ReturnType<typeof setTimeout> | null = null;
    private ready = false;
    private readySince: number | null = null;
    private connectionRevision = 0;
    private serverRetryAt = 0;
    private drainTimer: ReturnType<typeof setTimeout> | null = null;
    private drainPromise: Promise<boolean> | null = null;
    private resolveDrain: ((acknowledged: boolean) => void) | null = null;
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
        this.connectionRevision += 1;
        this.allowReconnect = true;
        this.intentionallyClosed = false;
        this.terminalError = false;
        this.reconnectAttempt = 0;
        await this.openSocket("CONNECTING");
    }

    sendAudio(frame: ArrayBuffer): boolean {
        const socket = this.socket;
        if (!socket || socket.readyState !== WebSocket.OPEN || !this.ready) {
            return false;
        }

        if (socket.bufferedAmount >= MAX_CLIENT_BUFFERED_BYTES || Date.now() < this.serverRetryAt) {
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
        this.connectionRevision += 1;
        this.disableReconnect();
        this.intentionallyClosed = true;
        this.terminalError = false;
        this.ready = false;
        this.readySince = null;
        this.serverRetryAt = 0;

        const socket = this.socket;
        this.socket = null;
        if (socket && socket.readyState < WebSocket.CLOSING) {
            socket.close(1000, "CLIENT_CLEANUP");
        }
        this.setState("DISCONNECTED");
        this.finishDrain();
    }

    closeGracefully(reason = "INPUT_ENDED"): Promise<boolean> {
        if (this.drainPromise) return this.drainPromise;
        const socket = this.socket;
        if (!socket || socket.readyState !== WebSocket.OPEN || !this.ready) {
            this.closeLocal();
            return Promise.resolve(false);
        }

        // 입력은 즉시 멈추지만 이미 전송한 마지막 발화의 결과는 STREAM_CLOSED까지 받는다.
        this.disableReconnect();
        this.ready = false;
        this.setState("DISCONNECTED");
        const pending = new Promise<boolean>((resolve) => {
            this.resolveDrain = resolve;
            this.drainTimer = setTimeout(() => this.closeLocal(), GRACEFUL_CLOSE_TIMEOUT_MS);
        });
        this.drainPromise = pending;
        try {
            this.sendControl("STREAM_CLOSE", reason);
        } catch {
            this.closeLocal();
        }
        return pending;
    }

    private finishDrain(acknowledged = false): void {
        if (this.drainTimer) clearTimeout(this.drainTimer);
        this.drainTimer = null;
        this.resolveDrain?.(acknowledged);
        this.resolveDrain = null;
        this.drainPromise = null;
    }

    private async openSocket(
        state: "CONNECTING" | "RECONNECTING",
    ): Promise<void> {
        const revision = this.connectionRevision;
        this.setState(state);
        this.ready = false;
        this.readySince = null;

        // 최초 연결도 재연결과 동일하게 늦은 ticket이 종료된 연결을 되살리지 못하게 한다.
        const ticket = await this.ticketProvider();
        if (!this.allowReconnect || this.intentionallyClosed || revision !== this.connectionRevision) {
            throw new DOMException("Voice connection cancelled.", "AbortError");
        }

        const url = getVoiceWebSocketUrl(this.sessionId, this.channel, ticket);

        await new Promise<void>((resolve, reject) => {
            const socket = new WebSocket(url);
            socket.binaryType = "arraybuffer";
            this.socket = socket;
            this.serverRetryAt = 0;
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
                this.readySince = Date.now();
                this.setState("STREAMING");
                resolve();
            };

            socket.onmessage = (message) => {
                if (this.socket !== socket || revision !== this.connectionRevision || typeof message.data !== "string") return;

                const event = this.parseEvent(message.data);
                if (!event || this.isDuplicate(event.eventId)) return;

                if (event.type === "STREAM_READY") {
                    settleReady();
                } else if (event.type === "BACKPRESSURE" && this.ready) {
                    // 서버가 안내한 대기시간과 브라우저 송신 버퍼가 모두 해소되어야 재개한다.
                    const retryAfterMs = Number.isFinite(event.retryAfterMs)
                        ? Math.max(0, Math.min(30_000, event.retryAfterMs!))
                        : 100;
                    this.serverRetryAt = Math.max(this.serverRetryAt, Date.now() + retryAfterMs);
                    this.setState("BACKPRESSURED");
                    this.scheduleBufferedAmountCheck();
                }

                // 저장/중계의 비복구 오류만 연결을 중단한다. 개별 발화의 언어·번역 실패는 계속 받는다.
                if (event.type === "VOICE_PIPELINE_FAILED"
                    && event.error?.code === "VOICE_BE_INTERNAL_ERROR"
                    && event.error.stage === "STREAM"
                    && event.error.retryable === false) {
                    this.terminalError = true;
                    this.disableReconnect();
                    this.ready = false;
                    this.readySince = null;
                    this.setState("ERROR");
                }

                this.onEvent(event);
                if (event.type === "STREAM_CLOSED") {
                    this.finishDrain(true);
                    this.closeLocal();
                }
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

                if (!settled) {
                    settled = true;
                    reject(new Error("Voice WebSocket closed before STREAM_READY."));
                    return;
                }

                // 이전 소켓의 지연 이벤트는 현재 소켓 상태를 변경하지 않는다.
                if (this.socket !== socket || revision !== this.connectionRevision) return;
                const wasStable = this.ready && this.readySince !== null
                    && Date.now() - this.readySince >= STABLE_CONNECTION_MS;
                this.ready = false;
                this.readySince = null;
                this.clearBufferedAmountTimer();

                if (this.intentionallyClosed || !this.allowReconnect) {
                    this.setState(this.terminalError ? "ERROR" : "DISCONNECTED");
                    this.finishDrain();
                    return;
                }

                // 짧게 READY만 반복하는 서버 오류는 재시도 예산을 회복시키지 않는다.
                // 30초 이상 안정적으로 연결된 뒤의 새 단절만 별도 장애로 취급한다.
                if (wasStable) this.reconnectAttempt = 0;
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
        if (this.bufferedAmountTimer || !this.allowReconnect || this.intentionallyClosed) return;

        this.bufferedAmountTimer = setTimeout(() => {
            this.bufferedAmountTimer = null;
            const socket = this.socket;
            if (!socket || socket.readyState !== WebSocket.OPEN || !this.ready || !this.allowReconnect) {
                return;
            }

            if (Date.now() >= this.serverRetryAt && socket.bufferedAmount < MAX_CLIENT_BUFFERED_BYTES / 2) {
                this.setState("STREAMING");
                return;
            }
            this.scheduleBufferedAmountCheck();
        }, this.serverRetryAt > Date.now()
            ? Math.max(10, Math.min(100, this.serverRetryAt - Date.now()))
            : 100);
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
