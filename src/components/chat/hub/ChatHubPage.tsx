"use client"

import { ChatHubHeader } from "@/components/chat/hub/ChatHubHeader";
import {
    ChatHubTabs,
    getChatHubTabButtonId,
    getChatHubTabPanelId,
} from "@/components/chat/hub/ChatHubTabs";
import type { ChatHubTab } from "@/components/chat/hub/chatHubTabConfig";
import { ChatRoomListContent } from "@/components/chat/list/ChatRoomListContent";
import FriendListWorkspace from "@/components/friends/FriendListWorkspace";
import { useRouter } from "@/navigation";

interface ChatHubPageProps {
    initialTab: ChatHubTab;
}

export function ChatHubPage({
    initialTab,
}: ChatHubPageProps) {
    const router = useRouter();
    const activeTab = initialTab;

    const handleTabChange = (nextTab: ChatHubTab) => {
        router.replace(
            nextTab === "friends"
                ? "/chat?tab=friends"
                : "/chat",
            { scroll: false },
        );
    };

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pt-20">
                <ChatHubHeader />

                <ChatHubTabs
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />

                <section
                    id={getChatHubTabPanelId(activeTab)}
                    role="tabpanel"
                    aria-labelledby={getChatHubTabButtonId(
                        activeTab,
                    )}
                    tabIndex={0}
                    className="min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950"
                >
                    {activeTab === "chat" ? (
                        <ChatRoomListContent
                            onStartFriendChat={() =>
                                handleTabChange("friends")
                            }
                        />
                    ) : (
                        <FriendListWorkspace />
                    )}
                </section>
            </div>
        </main>
    );
}