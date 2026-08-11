import type { Page, WebSocketRoute } from "@playwright/test";

const subscriptionIdsBySocket = new WeakMap<
    WebSocketRoute,
    Map<string, string>
>();

type StompMockOptions = {
    onSocket?: (ws: WebSocketRoute) => void;
    onSubscribe?: (destination: string, ws: WebSocketRoute) => void;
    onSend?: (destination: string, body: string, ws: WebSocketRoute) => void;
};

export interface StompMockController {
    hasSubscriber: (destination: string) => boolean;
    getSubscriberCount: (destination: string) => number;
    sendJsonToSubscribers: (destination: string, body: unknown) => void;
}

const parseHeader = (frame: string, name: string): string | null => {
    const line = frame
        .split("\n")
        .find((candidate) => candidate.startsWith(`${name}:`));
    return line ? line.slice(name.length + 1).trim() : null;
};

export async function mockStompBroker(
    page: Page,
    options: StompMockOptions = {},
): Promise<StompMockController> {
    const subscribersByDestination = new Map<
        string,
        Set<WebSocketRoute>
    >();

    const removeSocketSubscriptions = (ws: WebSocketRoute) => {
        const subscriptions = subscriptionIdsBySocket.get(ws);
        if (!subscriptions) {
            return;
        }

        for (const destination of subscriptions.keys()) {
            const subscribers = subscribersByDestination.get(destination);
            subscribers?.delete(ws);
            if (subscribers?.size === 0) {
                subscribersByDestination.delete(destination);
            }
        }

        subscriptionIdsBySocket.delete(ws);
    };

    await page.routeWebSocket(/.*/, (ws) => {
        options.onSocket?.(ws);

        // STOMP DISCONNECT frame이 오기 전에 WebSocket 자체가 닫히는 경로도 있다.
        // React Strict Mode의 effect cleanup/reconnect에서 닫힌 Route가 subscriber
        // Set에 남으면 hasSubscriber()가 stale socket 때문에 true가 되어 테스트가
        // 실제 활성 subscription 이전에 event를 보낼 수 있으므로 close 시 정리한다.
        ws.onClose(() => {
            removeSocketSubscriptions(ws);
        });

        ws.onMessage((message) => {
            const frame = String(message).replace(/\0+$/g, "");

            if (frame.startsWith("CONNECT") || frame.startsWith("STOMP")) {
                ws.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
                return;
            }

            if (frame.startsWith("SUBSCRIBE")) {
                const destination = parseHeader(frame, "destination") ?? "";
                const subscriptionId = parseHeader(frame, "id");

                if (subscriptionId) {
                    const current =
                        subscriptionIdsBySocket.get(ws) ??
                        new Map<string, string>();
                    current.set(destination, subscriptionId);
                    subscriptionIdsBySocket.set(ws, current);

                    const subscribers =
                        subscribersByDestination.get(destination) ??
                        new Set<WebSocketRoute>();
                    subscribers.add(ws);
                    subscribersByDestination.set(destination, subscribers);
                }

                options.onSubscribe?.(destination, ws);
                return;
            }

            if (frame.startsWith("UNSUBSCRIBE")) {
                const subscriptionId = parseHeader(frame, "id");
                const subscriptions = subscriptionIdsBySocket.get(ws);

                if (subscriptionId && subscriptions) {
                    const entry = Array.from(subscriptions.entries()).find(
                        ([, id]) => id === subscriptionId,
                    );

                    if (entry) {
                        const [destination] = entry;
                        subscriptions.delete(destination);

                        const subscribers =
                            subscribersByDestination.get(destination);
                        subscribers?.delete(ws);
                        if (subscribers?.size === 0) {
                            subscribersByDestination.delete(destination);
                        }
                    }
                }
                return;
            }

            if (frame.startsWith("DISCONNECT")) {
                removeSocketSubscriptions(ws);
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

    return {
        hasSubscriber: (destination) =>
            (subscribersByDestination.get(destination)?.size ?? 0) > 0,
        getSubscriberCount: (destination) =>
            subscribersByDestination.get(destination)?.size ?? 0,
        sendJsonToSubscribers: (destination, body) => {
            const subscribers = subscribersByDestination.get(destination);
            if (!subscribers || subscribers.size === 0) {
                throw new Error(
                    `No STOMP subscriber for destination: ${destination}`,
                );
            }

            let delivered = false;
            for (const ws of subscribers) {
                try {
                    sendStompJson(ws, destination, body);
                    delivered = true;
                } catch {
                    // React Strict Mode/reconnect로 이미 닫힌 Route가 남아 있어도
                    // 현재 활성 Subscriber로의 전달은 계속 시도한다.
                }
            }

            if (!delivered) {
                throw new Error(
                    `Failed to deliver STOMP message to destination: ${destination}`,
                );
            }
        },
    };
}

export function sendStompJson(
    ws: WebSocketRoute,
    destination: string,
    body: unknown,
): void {
    const payload = JSON.stringify(body);
    const subscriptionId =
        subscriptionIdsBySocket.get(ws)?.get(destination) ?? "sub-0";

    ws.send(
        [
            "MESSAGE",
            `destination:${destination}`,
            `subscription:${subscriptionId}`,
            "message-id:e2e-message",
            `content-length:${Buffer.byteLength(payload, "utf8")}`,
            "",
            payload,
        ].join("\n") + "\0",
    );
}
