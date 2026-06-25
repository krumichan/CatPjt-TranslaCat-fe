"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import { ChatMessageInput } from "@/components/chat/room/ChatMessageInput";
import { ChatMessageList } from "@/components/chat/room/ChatMessageList";
import { ChatRoomHeader } from "@/components/chat/room/ChatRoomHeader";
import { useChatRoom } from "@/hooks/chat/useChatRoom";
import {ChatMessage} from "@/types/chat";
import {useCallback} from "react";
import {useChatRoomWebSocket} from "@/hooks/chat/useChatRoomWebSocket";

interface ChatRoomPageProps {
    roomId: string;
}

export function ChatRoomPage({ roomId }: ChatRoomPageProps) {
    const t = useTranslations("ChatRoom");
    const { data: session } = useSession();

    const {
        room,
        messages,
        isLoading,
        isSending,
        isLoadingMore,
        hasNext,
        loadErrorCode,
        sendErrorCode,
        loadMoreErrorCode,
        appendMessage,
        reload,
        loadMoreMessages,
        sendMessage: sendRestMessage
    } = useChatRoom(roomId);

    const currentUserEmail = session?.user?.email ?? null;
    const accessToken = session?.accessToken ?? null;

    const handleMessageCreated = useCallback(
        (message: ChatMessage) => {
            appendMessage(message);
        },
        [appendMessage],
    );

    const {
        connectionStatus,
        isConnected,
        sendMessage: sendWebSocketMessage,
    } = useChatRoomWebSocket({
        roomId,
        accessToken,
        onMessageCreated: handleMessageCreated,
    });

    const sendMessage = useCallback(
        async (content: string) => {
            if (isConnected) {
                return sendWebSocketMessage(content);
            }

            return sendRestMessage(content);
        },
        [isConnected, sendRestMessage, sendWebSocketMessage],
    );

    if (isLoading) {
        return (
            <div className="fixed inset-x-0 bottom-0 top-15 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{t("loading")}</span>
                </div>
            </div>
        );
    }

    if (loadErrorCode || !room) {
        return (
            <div className="fixed inset-x-0 bottom-0 top-15 flex items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/40">
                        <AlertCircle className="h-6 w-6" />
                    </div>

                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {t("error.title")}
                    </h2>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {loadErrorCode ? t("error.loadFailed") : t("error.notFound")}
                    </p>

                    <button
                        type="button"
                        onClick={() => void reload()}
                        className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        {t("error.retry")}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-x-0 bottom-0 top-15 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
            <ChatRoomHeader room={room} connectionStatus={connectionStatus} />

            <ChatMessageList
                messages={messages}
                currentUserEmail={currentUserEmail}
                hasNext={hasNext}
                isLoadingMore={isLoadingMore}
                loadMoreErrorMessage={
                    loadMoreErrorCode ? t("pagination.loadFailed") : null
                }
                onLoadMore={loadMoreMessages}
            />

            <ChatMessageInput
                onSend={sendMessage}
                disabled={isSending}
                sendErrorMessage={sendErrorCode ? t("input.sendFailed") : null}
            />
        </div>
    );
}