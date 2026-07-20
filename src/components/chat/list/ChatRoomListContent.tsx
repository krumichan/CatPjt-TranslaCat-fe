"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChatRoomEmptyState } from "@/components/chat/list/ChatRoomEmptyState";
import { ChatRoomList } from "@/components/chat/list/ChatRoomList";
import { useChatRooms } from "@/hooks/chat/useChatRooms";

interface ChatRoomListContentProps {
    onStartFriendChat: () => void;
}

export function ChatRoomListContent({
    onStartFriendChat,
}: ChatRoomListContentProps) {
    const t = useTranslations("ChatRoomList");
    const { rooms, isLoading, loadErrorCode, reload } =
        useChatRooms();

    if (isLoading) {
        return (
            <section className="flex min-h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Loader2
                        className="h-5 w-5 animate-spin"
                        aria-hidden="true"
                    />
                    <span>{t("loading")}</span>
                </div>
            </section>
        );
    }

    if (loadErrorCode) {
        return (
            <section className="flex min-h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="w-full max-w-md text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-300">
                        <AlertCircle
                            className="h-6 w-6"
                            aria-hidden="true"
                        />
                    </div>

                    <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                        {t("error.title")}
                    </h2>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {t("error.loadFailed")}
                    </p>

                    <button
                        type="button"
                        onClick={() => void reload()}
                        className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        {t("error.retry")}
                    </button>
                </div>
            </section>
        );
    }

    if (rooms.length === 0) {
        return (
            <ChatRoomEmptyState
                onStartChatClick={onStartFriendChat}
            />
        );
    }

    return <ChatRoomList rooms={rooms} />;
}
