import type { VoiceChannel } from "@/types/voice";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function resolveWebSocketBaseUrl(): string {
    if (/^https?:\/\//.test(API_BASE_URL)) {
        return API_BASE_URL.replace(/\/$/, "").replace(/^http/, "ws");
    }

    if (typeof window !== "undefined") {
        const path = (API_BASE_URL || "/api/v1").replace(/\/$/, "");
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${window.location.host}${path}`;
    }

    return (API_BASE_URL || "/api/v1").replace(/\/$/, "");
}

export function getVoiceWebSocketUrl(
    sessionId: string,
    channel: VoiceChannel,
    ticket: string,
): string {
    return (
        `${resolveWebSocketBaseUrl()}/voice/sessions/${encodeURIComponent(sessionId)}` +
        `/channels/${channel}/stream?ticket=${encodeURIComponent(ticket)}`
    );
}
