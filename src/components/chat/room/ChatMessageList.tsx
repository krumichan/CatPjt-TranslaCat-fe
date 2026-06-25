"use client";

import { Loader2, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";

import { ChatMessageItem } from "@/components/chat/room/ChatMessageItem";
import type { ChatMessage } from "@/types/chat";
import {
    isElementNearBottom,
    scrollElementToBottom,
} from "@/utils/scroll";

interface ChatMessageListProps {
    messages: ChatMessage[];
    currentUserEmail: string | null;
    hasNext: boolean;
    isLoadingMore: boolean;
    loadMoreErrorMessage: string | null;
    onLoadMore: () => Promise<boolean>;
}

const LOAD_MORE_SCROLL_THRESHOLD = 80;

export function ChatMessageList({
    messages,
    currentUserEmail,
    hasNext,
    isLoadingMore,
    loadMoreErrorMessage,
    onLoadMore,
}: ChatMessageListProps) {
    const t = useTranslations("ChatRoom");

    const scrollContainerRef = useRef<HTMLElement | null>(null);
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
            <main className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 items-center justify-center px-4 py-6">
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        <MessageCircle className="h-7 w-7" />
                    </div>

                    <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        {t("empty.title")}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t("empty.description")}
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main
            ref={scrollContainerRef}
            onScroll={() => {
                const container = scrollContainerRef.current;

                shouldStickToBottomRef.current = isElementNearBottom(container);

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
            <div className="flex min-h-8 items-center justify-center">
                {isLoadingMore && (
                    <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{t("pagination.loadingPrevious")}</span>
                    </div>
                )}

                {!isLoadingMore && loadMoreErrorMessage && (
                    <button
                        type="button"
                        onClick={() => void tryLoadMore()}
                        className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-500 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950"
                    >
                        {loadMoreErrorMessage} · {t("pagination.retry")}
                    </button>
                )}

                {!isLoadingMore && !loadMoreErrorMessage && !hasNext && (
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        {t("pagination.noMoreMessages")}
                    </div>
                )}
            </div>

            <div className="mx-auto rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {t("date.today")}
            </div>

            {messages.map((message) => (
                <ChatMessageItem
                    key={message.id}
                    message={message}
                    isMine={
                        currentUserEmail != null && message.senderEmail === currentUserEmail
                    }
                />
            ))}
        </main>
    );
}