"use client";

import { MessageCircle, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

import {
    CHAT_HUB_TABS,
    type ChatHubTab,
} from "@/components/chat/hub/chatHubTabConfig";

interface ChatHubTabsProps {
    activeTab: ChatHubTab;
    onTabChange: (tab: ChatHubTab) => void;
}

const TAB_BUTTON_IDS: Record<ChatHubTab, string> = {
    chat: "chat-hub-tab-chat",
    friends: "chat-hub-tab-friends",
};

const TAB_PANEL_IDS: Record<ChatHubTab, string> = {
    chat: "chat-hub-panel-chat",
    friends: "chat-hub-panel-friends",
};

export function getChatHubTabButtonId(tab: ChatHubTab) {
    return TAB_BUTTON_IDS[tab];
}

export function getChatHubTabPanelId(tab: ChatHubTab) {
    return TAB_PANEL_IDS[tab];
}

export function ChatHubTabs({
    activeTab,
    onTabChange,
}: ChatHubTabsProps) {
    const t = useTranslations("ChatHub.tabs");

    const focusTab = (tab: ChatHubTab) => {
        window.requestAnimationFrame(() => {
            document.getElementById(TAB_BUTTON_IDS[tab])?.focus();
        });
    };

    const selectTab = (tab: ChatHubTab) => {
        onTabChange(tab);
        focusTab(tab);
    };

    const handleKeyDown = (
        event: React.KeyboardEvent<HTMLButtonElement>,
        currentTab: ChatHubTab,
    ) => {
        const currentIndex = CHAT_HUB_TABS.indexOf(currentTab);

        if (
            event.key === "ArrowRight" ||
            event.key === "ArrowDown"
        ) {
            event.preventDefault();
            const nextTab =
                CHAT_HUB_TABS[
                    (currentIndex + 1) % CHAT_HUB_TABS.length
                ];
            selectTab(nextTab);
            return;
        }

        if (
            event.key === "ArrowLeft" ||
            event.key === "ArrowUp"
        ) {
            event.preventDefault();
            const previousTab =
                CHAT_HUB_TABS[
                    (currentIndex - 1 + CHAT_HUB_TABS.length) %
                        CHAT_HUB_TABS.length
                ];
            selectTab(previousTab);
            return;
        }

        if (event.key === "Home") {
            event.preventDefault();
            selectTab(CHAT_HUB_TABS[0]);
            return;
        }

        if (event.key === "End") {
            event.preventDefault();
            selectTab(
                CHAT_HUB_TABS[CHAT_HUB_TABS.length - 1],
            );
        }
    };

    return (
        <div
            role="tablist"
            aria-label={t("ariaLabel")}
            className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <button
                id={TAB_BUTTON_IDS.chat}
                type="button"
                role="tab"
                aria-selected={activeTab === "chat"}
                aria-controls={TAB_PANEL_IDS.chat}
                tabIndex={activeTab === "chat" ? 0 : -1}
                onClick={() => onTabChange("chat")}
                onKeyDown={(event) =>
                    handleKeyDown(event, "chat")
                }
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    activeTab === "chat"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
            >
                <MessageCircle
                    className="h-4 w-4"
                    aria-hidden="true"
                />
                {t("chat")}
            </button>

            <button
                id={TAB_BUTTON_IDS.friends}
                type="button"
                role="tab"
                aria-selected={activeTab === "friends"}
                aria-controls={TAB_PANEL_IDS.friends}
                tabIndex={activeTab === "friends" ? 0 : -1}
                onClick={() => onTabChange("friends")}
                onKeyDown={(event) =>
                    handleKeyDown(event, "friends")
                }
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    activeTab === "friends"
                        ? "bg-orange-500 text-white shadow-sm dark:bg-orange-400 dark:text-slate-950"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
            >
                <UsersRound
                    className="h-4 w-4"
                    aria-hidden="true"
                />
                {t("friends")}
            </button>
        </div>
    );
}
