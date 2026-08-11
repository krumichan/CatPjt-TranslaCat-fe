"use client";

import { ArrowDown, Loader2, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatMessageItem } from "@/components/chat/room/ChatMessageItem";
import type {
    ChatAiDisclosureType,
    ChatLanguageSettings,
    ChatMessage,
    ChatRoomType,
} from "@/types/chat";
import {
    isElementNearBottom,
    scrollElementToBottom,
} from "@/utils/scroll";

interface ChatMessageListProps {
    messages: ChatMessage[];
    currentUserEmail: string | null;
    currentOpenChatMemberId?: number | null;
    roomType?: ChatRoomType | null;
    aiDisclosureType: ChatAiDisclosureType | null;
    languageSettings: ChatLanguageSettings | null;
    hasNext: boolean;
    isLoadingMore: boolean;
    hasNewer: boolean;
    isLoadingNewer: boolean;
    activeAnchorMessageId: number | null;
    loadMoreErrorMessage: string | null;
    loadNewerErrorMessage: string | null;
    retryingTranslationKeys: string[];
    retryTranslationErrorKeys: string[];
    onOpenSenderProfile?: (senderProfileId: number) => void;
    onOpenAiSenderProfile?: (aiMemberId: number) => void;
    onLoadMore: () => Promise<boolean>;
    onLoadNewer: () => Promise<boolean>;
    onJumpToLatest: () => Promise<boolean>;
    onMessageVisible: (messageId: number) => void;
    onRetryTranslation: (
        messageId: number,
        languageCode: string,
    ) => Promise<boolean>;
    onRefreshMessages: () => Promise<void>;
}

const LOAD_MORE_SCROLL_THRESHOLD = 80;
const LOAD_NEWER_SCROLL_THRESHOLD = 120;
const MESSAGE_VISIBILITY_THRESHOLD = 0.1;

export function ChatMessageList({
    messages,
    currentUserEmail,
    currentOpenChatMemberId = null,
    roomType = null,
    aiDisclosureType,
    languageSettings,
    hasNext,
    isLoadingMore,
    hasNewer,
    isLoadingNewer,
    activeAnchorMessageId,
    loadMoreErrorMessage,
    loadNewerErrorMessage,
    retryingTranslationKeys,
    retryTranslationErrorKeys,
    onOpenSenderProfile,
    onOpenAiSenderProfile,
    onLoadMore,
    onLoadNewer,
    onJumpToLatest,
    onMessageVisible,
    onRetryTranslation,
    onRefreshMessages,
}: ChatMessageListProps) {
    const t = useTranslations("ChatRoom");
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const shouldStickToBottomRef = useRef(activeAnchorMessageId === null);
    const loadMoreLockRef = useRef(false);
    const loadNewerLockRef = useRef(false);
    const appliedAnchorMessageIdRef = useRef<number | null>(null);
    const [isNearBottom, setIsNearBottom] = useState(
        activeAnchorMessageId === null,
    );
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

    const tryLoadNewer = useCallback(async () => {
        if (!hasNewer || isLoadingNewer || loadNewerLockRef.current) {
            return;
        }

        loadNewerLockRef.current = true;
        await onLoadNewer();
        loadNewerLockRef.current = false;
    }, [hasNewer, isLoadingNewer, onLoadNewer]);

    const jumpToLatest = useCallback(async () => {
        if (isLoadingNewer) {
            return;
        }

        const moved = await onJumpToLatest();
        if (!moved) {
            return;
        }
        shouldStickToBottomRef.current = true;
        appliedAnchorMessageIdRef.current = null;

        requestAnimationFrame(() => {
            scrollElementToBottom(scrollContainerRef.current, "auto");
            setIsNearBottom(true);
        });
    }, [isLoadingNewer, onJumpToLatest]);

    useEffect(() => {
        if (activeAnchorMessageId !== null) {
            shouldStickToBottomRef.current = false;
        }
    }, [activeAnchorMessageId]);

    useEffect(() => {
        if (
            activeAnchorMessageId === null ||
            appliedAnchorMessageIdRef.current === activeAnchorMessageId
        ) {
            return;
        }

        const container = scrollContainerRef.current;
        const anchorElement = container?.querySelector<HTMLElement>(
            `[data-chat-message-id="${activeAnchorMessageId}"]`,
        );

        if (!container || !anchorElement) {
            return;
        }

        appliedAnchorMessageIdRef.current = activeAnchorMessageId;
        shouldStickToBottomRef.current = false;

        requestAnimationFrame(() => {
            anchorElement.scrollIntoView({ block: "center" });
        });
    }, [activeAnchorMessageId, messages]);

    useEffect(() => {
        if (shouldStickToBottomRef.current) {
            scrollElementToBottom(scrollContainerRef.current, "smooth");
        }
    }, [latestMessageId]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || messages.length === 0) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                let latestVisibleMessageId: number | null = null;

                for (const entry of entries) {
                    if (!entry.isIntersecting) {
                        continue;
                    }

                    const rawMessageId = (
                        entry.target as HTMLElement
                    ).dataset.chatMessageId;
                    const messageId = Number(rawMessageId);
                    if (!Number.isSafeInteger(messageId) || messageId <= 0) {
                        continue;
                    }

                    latestVisibleMessageId = Math.max(
                        latestVisibleMessageId ?? 0,
                        messageId,
                    );
                }

                if (latestVisibleMessageId !== null) {
                    onMessageVisible(latestVisibleMessageId);
                }
            },
            {
                root: container,
                threshold: MESSAGE_VISIBILITY_THRESHOLD,
            },
        );

        const messageElements = container.querySelectorAll<HTMLElement>(
            "[data-chat-message-id]",
        );
        messageElements.forEach((element) => observer.observe(element));

        return () => observer.disconnect();
    }, [messages, onMessageVisible]);

    if (messages.length === 0) {
        return (
            <div
                data-testid="chat-message-empty-state"
                className="flex h-full min-h-0 flex-1 items-center justify-center px-4 py-6"
            >
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

    const showLatestButton = hasNewer || !isNearBottom;

    return (
        <div className="relative h-full min-h-0 w-full flex-1">
            <div
                ref={scrollContainerRef}
                onScroll={() => {
                    const container = scrollContainerRef.current;
                    const nearBottom = isElementNearBottom(container);
                    setIsNearBottom(nearBottom);
                    shouldStickToBottomRef.current = nearBottom && !hasNewer;

                    if (
                        container &&
                        container.scrollTop <= LOAD_MORE_SCROLL_THRESHOLD &&
                        hasNext
                    ) {
                        void tryLoadMore();
                    }

                    if (
                        container &&
                        container.scrollHeight -
                            container.scrollTop -
                            container.clientHeight <=
                            LOAD_NEWER_SCROLL_THRESHOLD &&
                        hasNewer
                    ) {
                        void tryLoadNewer();
                    }
                }}
                className="custom-scroll mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-4 overflow-y-auto px-4 py-6"
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

                {messages.map((message) => {
                    const isOpenRoom = roomType === "OPEN";
                    const isMine = isOpenRoom
                        ? currentOpenChatMemberId !== null &&
                          message.sender?.openChatMemberId ===
                              currentOpenChatMemberId
                        : !!currentUserEmail &&
                          message.senderEmail === currentUserEmail;
                    const senderProfileId = isOpenRoom
                        ? message.sender?.openChatMemberId ?? null
                        : message.senderUserId;

                    const canOpenSenderProfile =
                        !isMine &&
                        message.senderType === "USER" &&
                        senderProfileId !== null &&
                        onOpenSenderProfile !== undefined;
                    const canOpenAiSenderProfile =
                        !isMine &&
                        message.senderType === "AI" &&
                        message.senderAiMemberId !== null &&
                        onOpenAiSenderProfile !== undefined;

                    return (
                        <div key={message.id} className="contents">
                            {activeAnchorMessageId === message.id && (
                                <div
                                    data-testid="chat-first-unread-divider"
                                    role="separator"
                                    aria-label={t("readStatus.firstUnreadDivider")}
                                    className="flex items-center gap-3 py-1"
                                >
                                    <span className="h-px flex-1 bg-blue-300/70 dark:bg-blue-400/30" />
                                    <span className="shrink-0 text-xs font-bold text-blue-600 dark:text-blue-300">
                                        {t("readStatus.firstUnreadDivider")}
                                    </span>
                                    <span className="h-px flex-1 bg-blue-300/70 dark:bg-blue-400/30" />
                                </div>
                            )}

                            <div
                                data-chat-message-id={message.id}
                                data-testid={`chat-message-row-${message.id}`}
                            >
                                <ChatMessageItem
                                    message={message}
                                    isMine={isMine}
                                    isOpenRoom={isOpenRoom}
                                    aiDisclosureType={aiDisclosureType}
                                    languageSettings={languageSettings}
                                    retryingTranslationKeys={
                                        retryingTranslationKeys
                                    }
                                    retryTranslationErrorKeys={
                                        retryTranslationErrorKeys
                                    }
                                    onOpenSenderProfile={
                                        canOpenSenderProfile
                                            ? () =>
                                                  onOpenSenderProfile(
                                                      senderProfileId!,
                                                  )
                                            : undefined
                                    }
                                    onOpenAiSenderProfile={
                                        canOpenAiSenderProfile
                                            ? () =>
                                                  onOpenAiSenderProfile(
                                                      message.senderAiMemberId!,
                                                  )
                                            : undefined
                                    }
                                    onRetryTranslation={onRetryTranslation}
                                    onRefreshMessages={onRefreshMessages}
                                />
                            </div>
                        </div>
                    );
                })}

                {isLoadingNewer && hasNewer && (
                    <div className="flex justify-center py-1">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-white/10 dark:text-slate-300">
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            {t("pagination.loadingNewer")}
                        </span>
                    </div>
                )}

                {!isLoadingNewer && loadNewerErrorMessage && hasNewer && (
                    <div className="flex justify-center py-1">
                        <button
                            type="button"
                            onClick={() => void tryLoadNewer()}
                            className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-500 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950"
                        >
                            {loadNewerErrorMessage} · {t("pagination.retry")}
                        </button>
                    </div>
                )}
            </div>

            {showLatestButton && (
                <button
                    type="button"
                    data-testid="chat-jump-to-latest"
                    onClick={() => void jumpToLatest()}
                    disabled={isLoadingNewer}
                    className="absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-blue-200 bg-white/95 px-4 py-2 text-xs font-bold text-blue-600 shadow-lg backdrop-blur transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-400/30 dark:bg-slate-900/95 dark:text-blue-300 dark:hover:bg-slate-800"
                >
                    {isLoadingNewer ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                    )}
                    {t("pagination.jumpToLatest")}
                </button>
            )}
        </div>
    );
}
