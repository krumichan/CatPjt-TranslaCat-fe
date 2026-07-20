export const CHAT_HUB_TABS = ["chat", "friends"] as const;

export type ChatHubTab = (typeof CHAT_HUB_TABS)[number];

export function normalizeChatHubTab(
    value: string | string[] | undefined,
): ChatHubTab {
    const normalizedValue = Array.isArray(value) ? value[0] : value;

    return normalizedValue === "friends" ? "friends" : "chat";
}
