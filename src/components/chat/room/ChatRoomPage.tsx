"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatMessageInput } from "@/components/chat/room/ChatMessageInput";
import { ChatMessageList } from "@/components/chat/room/ChatMessageList";
import { ChatRoomHeader } from "@/components/chat/room/ChatRoomHeader";
import { ChatLanguageSettingsModal } from "@/components/chat/room/modal/ChatLanguageSettingsModal";
import { useChatLanguageSettings } from "@/hooks/chat/useChatLanguageSettings";
import { useChatRoom } from "@/hooks/chat/useChatRoom";
import { useChatRoomWebSocket } from "@/hooks/chat/useChatRoomWebSocket";
import type { ChatMessage, ChatMessageTranslation } from "@/types/chat";

interface ChatRoomPageProps {
    roomId: number;
}

const CHAT_ROOM_TOP_OFFSET_CLASS_NAME = "top-[68px]";
const AUTO_SCROLL_THRESHOLD_PX = 120;

export function ChatRoomPage({ roomId }: ChatRoomPageProps) {
    const t = useTranslations("ChatRoom");
    const { data: session } = useSession();
    const [isLanguageSettingsOpen, setIsLanguageSettingsOpen] =
        useState(false);
    const messageScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const didInitialScrollToBottomRef = useRef(false);
    const previousMessageCountRef = useRef(0);

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
        defaultSettings,
        resolvedSource: languageSettingsSource,
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

    const scrollToBottom = useCallback(
        (behavior: ScrollBehavior = "auto") => {
            const container = messageScrollContainerRef.current;

            if (!container) {
                return;
            }

            container.scrollTo({
                top: container.scrollHeight,
                behavior,
            });
        },
        [],
    );

    const isNearBottom = useCallback(() => {
        const container = messageScrollContainerRef.current;

        if (!container) {
            return true;
        }

        return (
            container.scrollHeight -
                container.scrollTop -
                container.clientHeight <=
            AUTO_SCROLL_THRESHOLD_PX
        );
    }, []);

    useEffect(() => {
        didInitialScrollToBottomRef.current = false;
        previousMessageCountRef.current = 0;
    }, [roomId]);

    useEffect(() => {
        if (isLoading || isLoadingMore || messages.length === 0) {
            previousMessageCountRef.current = messages.length;
            return;
        }

        const previousMessageCount = previousMessageCountRef.current;
        const shouldScrollToBottom =
            !didInitialScrollToBottomRef.current ||
            (messages.length > previousMessageCount && isNearBottom());

        previousMessageCountRef.current = messages.length;

        if (!shouldScrollToBottom) {
            return;
        }

        if (!didInitialScrollToBottomRef.current) {
            didInitialScrollToBottomRef.current = true;
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                scrollToBottom("auto");
            });
        });
    }, [
        isLoading,
        isLoadingMore,
        isNearBottom,
        messages.length,
        roomId,
        scrollToBottom,
    ]);

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
    const loadMoreErrorMessage = loadMoreErrorCode
        ? t("pagination.loadFailed")
        : null;

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-slate-500 dark:text-slate-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t("loading")}
            </div>
        );
    }

    if (loadErrorCode || !room) {
        return (
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-center justify-center px-4 text-center">
                <AlertCircle className="h-10 w-10 text-red-500" />
                <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t("error.title")}
                </h1>
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
        );
    }

    return (
        <>
            <div
                className={`fixed inset-x-0 bottom-0 ${CHAT_ROOM_TOP_OFFSET_CLASS_NAME} flex min-h-0 flex-col overflow-hidden bg-slate-950`}
            >
                <div className="shrink-0">
                    <ChatRoomHeader
                        room={room}
                        connectionStatus={connectionStatus}
                        languageSettings={languageSettings}
                        isLanguageSettingsLoading={isLanguageSettingsLoading}
                        languageSettingsLoadErrorCode={
                            languageSettingsLoadErrorCode
                        }
                        onOpenLanguageSettings={() =>
                            setIsLanguageSettingsOpen(true)
                        }
                    />
                </div>

                <div
                    ref={messageScrollContainerRef}
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                >
                    <ChatMessageList
                        messages={messages}
                        currentUserEmail={currentUserEmail}
                        languageSettings={languageSettings}
                        hasNext={hasNext}
                        isLoadingMore={isLoadingMore}
                        loadMoreErrorMessage={loadMoreErrorMessage}
                        retryingTranslationKeys={retryingTranslationKeys}
                        retryTranslationErrorKeys={retryTranslationErrorKeys}
                        onLoadMore={loadMoreMessages}
                        onRetryTranslation={retryTranslation}
                        onRefreshMessages={syncLatestMessages}
                    />
                </div>

                <div className="shrink-0">
                    <ChatMessageInput
                        onSend={sendMessage}
                        isSending={isMessageSending}
                        sendErrorMessage={sendErrorMessage}
                    />
                </div>
            </div>

            <ChatLanguageSettingsModal
                isOpen={isLanguageSettingsOpen}
                settings={languageSettings}
                defaultSettings={defaultSettings}
                resolvedSource={languageSettingsSource}
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
