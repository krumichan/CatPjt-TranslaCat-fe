"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { ChatMessageInput } from "@/components/chat/room/ChatMessageInput";
import { ChatMessageList } from "@/components/chat/room/ChatMessageList";
import { ChatRoomHeader } from "@/components/chat/room/ChatRoomHeader";
import { ChatLanguageSettingsModal } from "@/components/chat/room/modal/ChatLanguageSettingsModal";
import { useChatLanguageSettings } from "@/hooks/chat/useChatLanguageSettings";
import { useChatRoom } from "@/hooks/chat/useChatRoom";
import { useChatRoomWebSocket } from "@/hooks/chat/useChatRoomWebSocket";
import type {
    ChatMessage,
    ChatMessageTranslation,
} from "@/types/chat";

interface ChatRoomPageProps {
    roomId: number;
}

export function ChatRoomPage({ roomId }: ChatRoomPageProps) {
    const t = useTranslations("ChatRoom");
    const { data: session } = useSession();
    const [isLanguageSettingsOpen, setIsLanguageSettingsOpen] =
        useState(false);

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
        retryingTranslationKeys,
        retryTranslationErrorKeys,
        reload,
        loadMoreMessages,
        sendMessage: sendRestMessage,
        appendMessage,
        applyTranslationCompleted,
        syncLatestMessages,
        retryTranslation,
    } = useChatRoom(roomId);

    const {
        settings: languageSettings,
        isLoading: isLanguageSettingsLoading,
        isSaving: isLanguageSettingsSaving,
        loadErrorCode: languageSettingsLoadErrorCode,
        saveErrorCode: languageSettingsSaveErrorCode,
        reload: reloadLanguageSettings,
        saveSettings: saveLanguageSettings,
    } = useChatLanguageSettings(roomId);

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
            <div className="flex min-h-[60vh] items-center justify-center text-slate-500 dark:text-slate-300">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t("loading")}
            </div>
        );
    }

    if (loadErrorCode || !room) {
        return (
            <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-red-100 bg-red-50 p-8 text-center text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="mx-auto mb-3 h-8 w-8" />
                <h2 className="text-lg font-bold">{t("error.title")}</h2>
                <p className="mt-2 text-sm">
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
        );
    }

    return (
        <>
            <div className="fixed inset-x-0 bottom-0 top-15 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
                <ChatRoomHeader
                    room={room}
                    connectionStatus={connectionStatus}
                    languageSettings={languageSettings}
                    isLanguageSettingsLoading={isLanguageSettingsLoading}
                    languageSettingsLoadErrorCode={languageSettingsLoadErrorCode}
                    onOpenLanguageSettings={() =>
                        setIsLanguageSettingsOpen(true)
                    }
                />

                <ChatMessageList
                    messages={messages}
                    currentUserEmail={currentUserEmail}
                    languageSettings={languageSettings}
                    hasNext={hasNext}
                    isLoadingMore={isLoadingMore}
                    loadMoreErrorMessage={
                        loadMoreErrorCode ? t("pagination.loadFailed") : null
                    }
                    retryingTranslationKeys={retryingTranslationKeys}
                    retryTranslationErrorKeys={retryTranslationErrorKeys}
                    onLoadMore={loadMoreMessages}
                    onRetryTranslation={retryTranslation}
                    onRefreshMessages={syncLatestMessages}
                />

                <ChatMessageInput
                    isSending={isMessageSending}
                    sendErrorMessage={sendErrorMessage}
                    onSend={sendMessage}
                />
            </div>

            <ChatLanguageSettingsModal
                isOpen={isLanguageSettingsOpen}
                settings={languageSettings}
                isLoading={isLanguageSettingsLoading}
                isSaving={isLanguageSettingsSaving}
                loadErrorCode={languageSettingsLoadErrorCode}
                saveErrorCode={languageSettingsSaveErrorCode}
                onClose={() => setIsLanguageSettingsOpen(false)}
                onSave={saveLanguageSettings}
                onReload={reloadLanguageSettings}
            />
        </>
    );
}
