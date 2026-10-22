"use client";

import { ArrowLeft, ChevronRight, MailOpen, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Link, useRouter } from "@/navigation";
import { openChatInvitationService } from "@/services/chat/openChatInvitationService";
import type { ChatNotificationActivityItem } from "@/types/chatNotification";
import {
    announceOpenInvitationChanged,
    getOpenInvitationPayloadText,
    getOpenInvitationRoomId,
    isOpenLinkInvitation,
    OPEN_CHAT_INVITATION_CHANGED,
} from "@/utils/chat/openChatInvitation";

function OpenChatInvitationInboxContent({
    accountKey,
    loginSessionId,
    isSessionLoading,
}: {
    accountKey: string | null;
    loginSessionId: string | null;
    isSessionLoading: boolean;
}) {
    const t = useTranslations("OpenChatInvitationInbox");
    const router = useRouter();
    const activeAccountRef = useRef(accountKey);
    const revisionRef = useRef(0);
    const itemsRef = useRef<ChatNotificationActivityItem[]>([]);
    const refreshInFlightRef = useRef(false);
    const loadMoreInFlightRef = useRef(false);
    const refreshQueuedRef = useRef(false);
    const [items, setItems] = useState<ChatNotificationActivityItem[]>([]);
    const [cursorId, setCursorId] = useState<number | null>(null);
    const [hasNext, setHasNext] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [readErrorId, setReadErrorId] = useState<number | null>(null);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    const loadFirst = useCallback(async (key: string) => {
        if (loadMoreInFlightRef.current) {
            refreshQueuedRef.current = true;
            return;
        }

        const revision = ++revisionRef.current;
        refreshInFlightRef.current = true;
        setIsRefreshing(true);
        setLoadFailed(false);
        setReadErrorId(null);

        try {
            // 새로고침과 늦은 응답은 현재 계정·조회 세대가 같을 때만 반영한다.
            const previousItems = itemsRef.current;
            const oldestVisibleId = previousItems.at(-1)?.id ?? null;
            const refreshed: ChatNotificationActivityItem[] = [];
            let nextCursor: number | null = null;
            let moreAvailable = false;

            // 현재 펼친 가장 오래된 초대까지 다시 읽어, 전경 갱신 후에도 페이지가 사라지지 않게 한다.
            for (let pageIndex = 0; pageIndex < 50; pageIndex += 1) {
                if (loginSessionId === null) {
                    return;
                }
                const response = await openChatInvitationService.list(
                    loginSessionId,
                    nextCursor,
                );
                refreshed.push(...response.items);
                nextCursor = response.nextCursorId;
                moreAvailable = response.hasNext;

                if (
                    !moreAvailable ||
                    nextCursor === null ||
                    oldestVisibleId === null ||
                    refreshed.some((item) => item.id <= oldestVisibleId)
                ) {
                    break;
                }
            }
            if (activeAccountRef.current !== key || revisionRef.current !== revision) {
                return;
            }

            itemsRef.current = refreshed;
            setItems(refreshed);
            setCursorId(nextCursor);
            setHasNext(moreAvailable);
        } catch {
            if (activeAccountRef.current === key && revisionRef.current === revision) {
                setLoadFailed(true);
            }
        } finally {
            if (activeAccountRef.current === key && revisionRef.current === revision) {
                setIsLoading(false);
                setIsRefreshing(false);
                refreshInFlightRef.current = false;
            }
        }
    }, [loginSessionId]);

    useEffect(() => {
        // 계정이 바뀌면 이전 사용자의 초대를 즉시 지우고 새 계정만 조회한다.
        activeAccountRef.current = accountKey;
        ++revisionRef.current;
        setItems([]);
        itemsRef.current = [];
        setCursorId(null);
        setHasNext(false);
        setLoadFailed(false);
        setIsLoading(true);
        setIsLoadingMore(false);
        setIsRefreshing(false);
        setProcessingId(null);
        refreshInFlightRef.current = false;
        loadMoreInFlightRef.current = false;
        refreshQueuedRef.current = false;

        if (accountKey === null || loginSessionId === null) {
            setIsLoading(isSessionLoading);
        } else {
            void loadFirst(accountKey);
        }

        return () => {
            activeAccountRef.current = null;
        };
    }, [accountKey, isSessionLoading, loadFirst, loginSessionId]);

    useEffect(() => {
        if (accountKey === null) {
            return;
        }

        // 전경 복귀·WebSocket 수신·재연결 시 REST 목록을 다시 확인한다.
        const refresh = () => void loadFirst(accountKey);
        const refreshWhenVisible = () => {
            if (document.visibilityState === "visible") {
                refresh();
            }
        };

        window.addEventListener(OPEN_CHAT_INVITATION_CHANGED, refresh);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refreshWhenVisible);
        const timer = window.setInterval(refreshWhenVisible, 30000);

        return () => {
            window.removeEventListener(OPEN_CHAT_INVITATION_CHANGED, refresh);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
            window.clearInterval(timer);
        };
    }, [accountKey, loadFirst]);

    const loadMore = async () => {
        if (
            accountKey === null ||
            !hasNext ||
            cursorId === null ||
            isLoadingMore ||
            refreshInFlightRef.current
        ) {
            return;
        }

        const revision = revisionRef.current;
        loadMoreInFlightRef.current = true;
        setIsLoadingMore(true);
        setLoadFailed(false);

        try {
            if (loginSessionId === null) {
                return;
            }
            const response = await openChatInvitationService.list(
                loginSessionId,
                cursorId,
            );
            if (activeAccountRef.current !== accountKey || revisionRef.current !== revision) {
                return;
            }

            const seen = new Set(itemsRef.current.map((item) => item.id));
            const merged = [
                ...itemsRef.current,
                ...response.items.filter(
                    (item) => isOpenLinkInvitation(item) && !seen.has(item.id),
                ),
            ];
            itemsRef.current = merged;
            setItems(merged);
            setCursorId(response.nextCursorId);
            setHasNext(response.hasNext);
        } catch {
            if (activeAccountRef.current === accountKey && revisionRef.current === revision) {
                setLoadFailed(true);
            }
        } finally {
            loadMoreInFlightRef.current = false;
            if (activeAccountRef.current === accountKey) {
                setIsLoadingMore(false);
                if (refreshQueuedRef.current) {
                    refreshQueuedRef.current = false;
                    void loadFirst(accountKey);
                }
            }
        }
    };

    const markRead = async (item: ChatNotificationActivityItem): Promise<boolean> => {
        if (item.isRead) {
            return true;
        }
        if (
            accountKey === null ||
            loginSessionId === null ||
            processingId !== null ||
            !Number.isSafeInteger(item.id)
        ) {
            return false;
        }

        setProcessingId(item.id);
        setReadErrorId(null);

        try {
            const updated = await openChatInvitationService.markRead(
                item.id,
                loginSessionId,
            );
            if (activeAccountRef.current !== accountKey) {
                return false;
            }

            const updatedItems = itemsRef.current.map((candidate) =>
                candidate.id === item.id ? updated : candidate,
            );
            itemsRef.current = updatedItems;
            setItems(updatedItems);
            announceOpenInvitationChanged();
            return true;
        } catch {
            if (activeAccountRef.current === accountKey) {
                setReadErrorId(item.id);
            }
            return false;
        } finally {
            if (activeAccountRef.current === accountKey) {
                setProcessingId(null);
            }
        }
    };

    const openRoom = async (item: ChatNotificationActivityItem) => {
        const roomId = getOpenInvitationRoomId(item);
        if (roomId === null || accountKey === null) {
            return;
        }

        if (!item.isRead && !(await markRead(item))) {
            return;
        }

        if (activeAccountRef.current === accountKey) {
            router.push(`/chat/open/${roomId}`);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pt-20">
                <Link
                    href="/chat"
                    className="inline-flex items-center gap-2 self-start text-sm font-bold text-slate-600 dark:text-slate-300"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t("back")}
                </Link>

                <header className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                        {t("title")}
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                        {t("description")}
                    </p>
                </header>

                {isLoading && <p role="status">{t("loading")}</p>}
                {loadFailed && (
                    <div
                        role="alert"
                        className="flex items-center justify-between gap-3 rounded-2xl bg-rose-50 p-4 text-rose-700"
                    >
                        <span>{t("loadFailed")}</span>
                        <button
                            type="button"
                            onClick={() => accountKey && void loadFirst(accountKey)}
                            className="inline-flex items-center gap-2 font-bold"
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            {t("retry")}
                        </button>
                    </div>
                )}
                {!isLoading && !loadFailed && items.length === 0 && (
                    <p
                        className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900"
                        data-testid="open-invitation-empty"
                    >
                        {t("empty")}
                    </p>
                )}

                <ul className="flex flex-col gap-3" data-testid="open-invitation-list">
                    {items.map((item) => {
                        const roomId = getOpenInvitationRoomId(item);
                        const roomName =
                            getOpenInvitationPayloadText(item, "roomName") ??
                            t("unknownRoom");
                        const nickname =
                            getOpenInvitationPayloadText(item, "inviterOpenNickname") ??
                            t("unknownInviter");
                        const memberCode = getOpenInvitationPayloadText(
                            item,
                            "inviterMemberCode",
                        );

                        return (
                            <li
                                key={item.id}
                                data-testid={`open-invitation-${item.id}`}
                                className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white">
                                            {roomName}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                            {t("invitedBy", { nickname })}
                                        </p>
                                        {memberCode && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                {t("memberCode", { code: memberCode })}
                                            </p>
                                        )}
                                    </div>
                                    {!item.isRead && (
                                        <span className="shrink-0 rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">
                                            {t("new")}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {roomId === null ? (
                                        <span className="text-sm text-rose-600">
                                            {t("roomUnavailable")}
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={processingId === item.id}
                                            onClick={() => void openRoom(item)}
                                            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                                        >
                                            {t("preview")}
                                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    )}
                                    {!item.isRead && (
                                        <button
                                            type="button"
                                            disabled={processingId === item.id}
                                            onClick={() => void markRead(item)}
                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold dark:border-slate-600"
                                        >
                                            <MailOpen className="h-4 w-4" aria-hidden="true" />
                                            {t("read")}
                                        </button>
                                    )}
                                </div>
                                {readErrorId === item.id && (
                                    <p role="alert" className="mt-2 text-sm text-rose-600">
                                        {t("readFailed")}
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>

                {hasNext && (
                    <button
                        type="button"
                        disabled={isLoadingMore || isRefreshing}
                        onClick={() => void loadMore()}
                        className="self-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold disabled:opacity-50 dark:border-slate-700"
                    >
                        {isLoadingMore ? t("loadingMore") : t("loadMore")}
                    </button>
                )}
            </div>
        </main>
    );
}

export function OpenChatInvitationInboxPage() {
    const { data: session, status } = useSession();
    const accountKey = session?.loginSessionId
        ? `${session.loginSessionId}:${session.user?.email?.trim().toLowerCase() ?? ""}`
        : null;

    // key가 바뀌는 첫 렌더부터 새 인스턴스를 사용해 이전 계정 카드를 노출하지 않는다.
    return (
        <OpenChatInvitationInboxContent
            key={accountKey ?? "no-account"}
            accountKey={accountKey}
            loginSessionId={session?.loginSessionId ?? null}
            isSessionLoading={status === "loading"}
        />
    );
}
