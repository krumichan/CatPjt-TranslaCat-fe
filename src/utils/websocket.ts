const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function getChatWebSocketUrl() {
    const explicitWsUrl = process.env.NEXT_PUBLIC_WS_URL;

    if (explicitWsUrl) {
        return explicitWsUrl;
    }

    const apiRootUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
    const wsRootUrl = apiRootUrl.replace(/^http/, "ws");

    return `${wsRootUrl}/ws/chat`;
}