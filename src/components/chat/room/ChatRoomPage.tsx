"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import { ChatMessageInput } from "@/components/chat/room/ChatMessageInput";
import { ChatMessageList } from "@/components/chat/room/ChatMessageList";
import { ChatRoomHeader } from "@/components/chat/room/ChatRoomHeader";
import { useChatRoom } from "@/hooks/chat/useChatRoom";
import type {
    ChatMessage,
    ChatMessageTranslation,
} from "@/types/chat";
import {useCallback} from "react";
import {useChatRoomWebSocket} from "@/hooks/chat/useChatRoomWebSocket";

interface ChatRoomPageProps {
    roomId: number;
}

export function ChatRoomPage({ roomId }: ChatRoomPageProps) {
    const t = useTranslations("ChatRoom");
    const { data: session } = useSession();

    const {
        room,
        messages,
        isLoading,
        isSending: isRestSending,
        isLoadingMore,
        hasNext,
        loadErrorCode,
        sendErrorCode: restSendErrorCode,
        loadMoreErrorCode,
        reload,
        loadMoreMessages,
        sendMessage: sendRestMessage,
        appendMessage,
        applyTranslationCompleted,
        syncLatestMessages,
    } = useChatRoom(roomId);

    const accessToken = session?.accessToken ?? null;
    const currentUserEmail = session?.user?.email ?? null;

    const handleMessageCreated = useCallback(
        (message: ChatMessage) => {
            appendMessage(message);
        },
        [appendMessage],
    );

    const handleTranslationCompleted = useCallback(
        (messageId: number, translation: ChatMessageTranslation) => {
            applyTranslationCompleted(messageId, translation);
        },
        [applyTranslationCompleted],
    );

    const {
        connectionStatus,
        isConnected,
        isSending: isWebSocketSending,
        sendErrorCode: webSocketSendErrorCode,
        sendMessage: sendWebSocketMessage,
    } = useChatRoomWebSocket({
        roomId,
        accessToken,
        onMessageCreated: handleMessageCreated,
        onTranslationCompleted: handleTranslationCompleted,
        onReconnectSyncRequested: syncLatestMessages,
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

    const isMessageSending = isConnected ? isWebSocketSending : isRestSending;

    const sendErrorMessage =
        webSocketSendErrorCode || restSendErrorCode
            ? t("input.sendFailed")
            : null;

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
                disabled={isMessageSending}
                sendErrorMessage={sendErrorMessage}
            />
        </div>
    );
}