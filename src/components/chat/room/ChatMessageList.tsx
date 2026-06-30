"use client";

import { Loader2, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";

import { ChatMessageItem } from "@/components/chat/room/ChatMessageItem";
import type { ChatLanguageSettings, ChatMessage } from "@/types/chat";
import {
    isElementNearBottom,
    scrollElementToBottom,
} from "@/utils/scroll";

interface ChatMessageListProps {
    messages: ChatMessage[];
    currentUserEmail: string | null;
    languageSettings: ChatLanguageSettings | null;
    hasNext: boolean;
    isLoadingMore: boolean;
    loadMoreErrorMessage: string | null;
    retryingTranslationKeys: string[];
    retryTranslationErrorKeys: string[];
    onLoadMore: () => Promise<boolean>;
    onRetryTranslation: (
        messageId: number,
        languageCode: string,
    ) => Promise<boolean>;
    onRefreshMessages: () => Promise<void>;
}

const LOAD_MORE_SCROLL_THRESHOLD = 80;

export function ChatMessageList({
    messages,
    currentUserEmail,
    languageSettings,
    hasNext,
    isLoadingMore,
    loadMoreErrorMessage,
    retryingTranslationKeys,
    retryTranslationErrorKeys,
    onLoadMore,
    onRetryTranslation,
    onRefreshMessages,
}: ChatMessageListProps) {
    const t = useTranslations("ChatRoom");
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const shouldStickToBottomRef = useRef(true);
    const loadMoreLockRef = useRef(false);
    const latestMessageId =
        messages.length > 0 ? messages[messages.length - 1].id : null;

    const tryLoadMore = useCallback(async () => {
        const container = scrollContainerRef.current;

        if (!container || !hasNext || isLoadingMore || loadMoreLockRef.current) {
            return;
        }

        loadMoreLockRef.current = true;

        const previousScrollHeight = container.scrollHeight;
        const previousScrollTop = container.scrollTop;
        const loaded = await onLoadMore();

        requestAnimationFrame(() => {
            const nextContainer = scrollContainerRef.current;

            if (loaded && nextContainer) {
                nextContainer.scrollTop =
                    nextContainer.scrollHeight -
                    previousScrollHeight +
                    previousScrollTop;
            }

            loadMoreLockRef.current = false;
        });
    }, [hasNext, isLoadingMore, onLoadMore]);

    useEffect(() => {
        if (shouldStickToBottomRef.current) {
            scrollElementToBottom(scrollContainerRef.current, "smooth");
        }
    }, [latestMessageId]);

    if (messages.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center px-4">
                <div className="max-w-sm rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-900/70">
                    <MessageCircle className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {t("empty.title")}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {t("empty.description")}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={scrollContainerRef}
            onScroll={() => {
                const container = scrollContainerRef.current;
                shouldStickToBottomRef.current =
                    isElementNearBottom(container);

                if (
                    container &&
                    container.scrollTop <= LOAD_MORE_SCROLL_THRESHOLD &&
                    hasNext
                ) {
                    void tryLoadMore();
                }
            }}
            className="custom-scroll mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-6"
        >
            {isLoadingMore && (
                <div className="flex justify-center">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-white/10 dark:text-slate-300">
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        {t("pagination.loadingPrevious")}
                    </span>
                </div>
            )}

            {!isLoadingMore && loadMoreErrorMessage && (
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={() => void tryLoadMore()}
                        className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-500 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950"
                    >
                        {loadMoreErrorMessage} · {t("pagination.retry")}
                    </button>
                </div>
            )}

            {!isLoadingMore && !loadMoreErrorMessage && !hasNext && (
                <div className="flex justify-center">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-400 dark:bg-white/10 dark:text-slate-500">
                        {t("pagination.noMoreMessages")}
                    </span>
                </div>
            )}

            <div className="flex justify-center">
                <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">
                    {t("date.today")}
                </span>
            </div>

            {messages.map((message) => (
                <ChatMessageItem
                    key={message.id}
                    message={message}
                    isMine={
                        !!currentUserEmail &&
                        message.senderEmail === currentUserEmail
                    }
                    languageSettings={languageSettings}
                    retryingTranslationKeys={retryingTranslationKeys}
                    retryTranslationErrorKeys={retryTranslationErrorKeys}
                    onRetryTranslation={onRetryTranslation}
                    onRefreshMessages={onRefreshMessages}
                />
            ))}
        </div>
    );
}
