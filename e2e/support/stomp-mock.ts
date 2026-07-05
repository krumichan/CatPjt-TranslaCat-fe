import type { Page, WebSocketRoute } from "@playwright/test";

type StompMockOptions = {
    onSocket?: (ws: WebSocketRoute) => void;
    onSend?: (destination: string, body: string, ws: WebSocketRoute) => void;
};

const parseHeader = (frame: string, name: string): string | null => {
    const line = frame
        .split("\n")
        .find((candidate) => candidate.startsWith(`${name}:`));
    return line ? line.slice(name.length + 1).trim() : null;
};

export async function mockStompBroker(
    page: Page,
    options: StompMockOptions = {},
): Promise<void> {
    await page.routeWebSocket(/.*/, (ws) => {
        options.onSocket?.(ws);

        ws.onMessage((message) => {
            const frame = String(message).replace(/\0+$/g, "");

            if (frame.startsWith("CONNECT") || frame.startsWith("STOMP")) {
                ws.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
                return;
            }

            if (frame.startsWith("SEND")) {
                const destination = parseHeader(frame, "destination") ?? "";
                const bodyStart = frame.indexOf("\n\n");
                const body = bodyStart >= 0 ? frame.slice(bodyStart + 2) : "";
                options.onSend?.(destination, body, ws);
            }
        });
    });
}

export function sendStompJson(
    ws: WebSocketRoute,
    destination: string,
    body: unknown,
): void {
    const payload = JSON.stringify(body);
    ws.send(
        [
            "MESSAGE",
            `destination:${destination}`,
            "subscription:sub-0",
            "message-id:e2e-message",
            `content-length:${Buffer.byteLength(payload, "utf8")}`,
            "",
            payload,
        ].join("\n") + "\0",
    );
}
