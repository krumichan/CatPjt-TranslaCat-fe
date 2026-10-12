"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { mutate } from "swr";

import {
    parseSupportId,
    parseSupportStatus,
    parseSupportTab,
    supportErrorKey,
} from "@/features/support/supportModel";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/navigation";
import { supportService } from "@/services/support/supportService";
import type { SupportDraft, SupportItem, SupportPage, SupportTab } from "@/types/support";

function refreshSupportNotifications(owner: string) {
    // 상세 조회에서 서버가 처리한 읽음 상태를 기존 알림센터에도 반영한다.
    void mutate((key) => Array.isArray(key) && key[1] === owner && (
        key[0] === "support-notification-summary" || key[0] === "support-notification-list"
    )).catch(() => undefined);
}

export function useSupportController() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const params = useSearchParams();
    const tab = parseSupportTab(params.get("tab"));
    const id = parseSupportId(params.get("id"));
    const replyId = parseSupportId(params.get("replyId"));
    const notificationId = parseSupportId(params.get("notificationId"));
    const page = Math.max(0, parseSupportId(params.get("page")) ?? 0);
    const status = parseSupportStatus(params.get("status"));
    const search = params.get("search") ?? "";
    const isAdmin = session?.user.role === "ADMIN";
    const owner = session?.user.publicId ?? session?.user.email ?? "";
    const enabled = authStatus === "authenticated";
    const requestedView = params.get("view");
    const canCreate = tab === "inquiries" ? !isAdmin : isAdmin;
    const isEditing = requestedView === "edit" && tab === "notices" && isAdmin && id !== null;
    const isComposing = (requestedView === "new" && canCreate) || isEditing;
    const relatedMessageId = tab === "inquiries" && isComposing
        ? parseSupportId(params.get("relatedMessageId"))
        : null;
    const scope = `${owner}:${params.toString()}`;

    const [isBusy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const busy = useRef(false);
    const activeScope = useRef(scope);
    const mounted = useRef(true);
    const lastRead = useRef<SupportItem | null>(null);
    const focusedReply = useRef("");

    useEffect(() => {
        activeScope.current = scope;
        setActionError(null);
        setDeleteOpen(false);
    }, [scope]);

    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;
        };
    }, []);

    const listQuery = useQuery<SupportPage<SupportItem>, readonly unknown[]>({
        keys: ["support-list", owner, isAdmin, tab, page, status ?? "", search],
        enabled: enabled && !id && !isComposing,
        fetcher: async () => {
            if (tab === "notices") {
                return supportService.listNotices({ page });
            }

            if (tab === "messages") {
                return supportService.listMessages({ page });
            }

            return supportService.listInquiries({ page, status, search });
        },
        config: { revalidateOnMount: true, shouldRetryOnError: false },
    });

    const detailQuery = useQuery<SupportItem, readonly unknown[]>({
        // 같은 항목의 새 알림도 별도 조회로 처리해 최신 본문과 읽음 상태를 확인한다.
        keys: ["support-detail", owner, isAdmin, tab, id, replyId ?? "", notificationId ?? ""],
        enabled: enabled && id !== null,
        fetcher: async () => {
            if (tab === "notices") {
                return supportService.getNotice(id!);
            }

            if (tab === "messages") {
                return supportService.getMessage(id!);
            }

            return supportService.getInquiry(id!);
        },
        config: {
            revalidateOnMount: true,
            revalidateOnFocus: !isEditing,
            revalidateIfStale: !isEditing,
            shouldRetryOnError: false,
        },
    });

    const relatedQuery = useQuery({
        keys: ["support-related-message", owner, relatedMessageId] as const,
        enabled: enabled && relatedMessageId !== null,
        fetcher: () => supportService.getMessage(relatedMessageId!),
        config: { revalidateOnMount: true, shouldRetryOnError: false },
    });

    useEffect(() => {
        // 조회 함수와 분리해 새 상세 응답마다 한 번만 알림 캐시를 갱신한다.
        if (detailQuery.data && lastRead.current !== detailQuery.data) {
            lastRead.current = detailQuery.data;
            refreshSupportNotifications(owner);
        }
    }, [detailQuery.data, owner]);

    useEffect(() => {
        if (!replyId || !detailQuery.data || tab !== "inquiries") {
            focusedReply.current = "";
            return;
        }

        const target = `${owner}:${id}:${replyId}`;

        if (focusedReply.current === target) {
            return;
        }

        const reply = document.getElementById(`support-reply-${replyId}`);

        if (reply) {
            focusedReply.current = target;
            reply.scrollIntoView({ block: "center", behavior: "smooth" });
            reply.focus({ preventScroll: true });
        }
    }, [replyId, detailQuery.data, tab, id, owner]);

    const navigate = useCallback((nextTab: SupportTab, values: Record<string, string | number | undefined> = {}) => {
        const next = new URLSearchParams({ tab: nextTab });

        for (const [key, value] of Object.entries(values)) {
            if (value !== undefined && value !== "") {
                next.set(key, String(value));
            }
        }

        router.push(`/support?${next.toString()}`, { scroll: false });
    }, [router]);

    const refreshLists = useCallback(() => {
        void mutate((key) => Array.isArray(key) && key[0] === "support-list" && key[1] === owner)
            .catch(() => undefined);
        refreshSupportNotifications(owner);
    }, [owner]);

    const runAction = useCallback(async <T,>(action: () => Promise<T>, onSuccess: (value: T) => void | Promise<void>) => {
        // 클릭 중복과 화면 이동 뒤에 도착하는 응답의 화면 변경을 막는다.
        if (busy.current) {
            return false;
        }

        busy.current = true;
        setBusy(true);
        setActionError(null);
        const startedScope = scope;

        try {
            const result = await action();
            refreshLists();

            if (!mounted.current || activeScope.current !== startedScope) {
                return false;
            }

            await onSuccess(result);
            return true;
        } catch (error) {
            if (mounted.current && activeScope.current === startedScope) {
                setActionError(supportErrorKey(error));
            }

            return false;
        } finally {
            busy.current = false;

            if (mounted.current) {
                setBusy(false);
            }
        }
    }, [refreshLists, scope]);

    const submitDraft = (draft: SupportDraft) => runAction(async () => {
        const content = draft.content.trim();
        const title = draft.title.trim();

        if (tab === "inquiries") {
            return supportService.createInquiry({
                title,
                content,
                category: draft.category,
                relatedMessageId: relatedMessageId ?? undefined,
            });
        }

        if (tab === "notices") {
            return supportService.saveNotice(
                { title, content, noticeType: draft.noticeType },
                isEditing ? id! : undefined,
            );
        }

        return supportService.sendMessage({ title, content, recipientId: draft.recipient!.id });
    }, (result) => navigate(tab, { id: result.id }));

    const submitReply = (content: string, parentId?: number) => runAction(
        () => supportService.reply(id!, { content: content.trim(), parentId }),
        async () => {
            // 답글 응답 형식과 무관하게 최신 문의 및 처리 상태를 다시 조회한다.
            await detailQuery.mutate().catch(() => undefined);
        },
    );

    const changeStatus = (next: "WAITING" | "CLOSED") => runAction(
        () => supportService.updateStatus(id!, next),
        async () => {
            await detailQuery.mutate().catch(() => undefined);
        },
    );

    const deleteNotice = () => runAction(
        () => supportService.deleteNotice(id!),
        () => navigate("notices"),
    );

    const loadError = id
        ? detailQuery.isError
        : relatedMessageId
            ? relatedQuery.isError
            : listQuery.isError;
    const isLoading = authStatus === "loading" || (id
        ? detailQuery.isLoading
        : relatedMessageId
            ? relatedQuery.isLoading
            : !isComposing && listQuery.isLoading);

    return {
        tab, id, page, status, search, scope, isAdmin, authStatus,
        isComposing, isEditing, canCreate, isLoading, isBusy, actionError,
        error: loadError ? supportErrorKey(loadError) : null,
        items: listQuery.data?.items ?? [],
        totalElements: listQuery.data?.totalElements ?? 0,
        totalPages: listQuery.data?.totalPages ?? 0,
        detail: detailQuery.data,
        relatedMessage: relatedQuery.data,
        deleteOpen, setDeleteOpen, navigate, submitDraft, submitReply,
        changeStatus, deleteNotice,
        reload: () => {
            if (id) {
                void detailQuery.mutate().catch(() => undefined);
            } else if (relatedMessageId) {
                void relatedQuery.mutate().catch(() => undefined);
            } else {
                void listQuery.mutate().catch(() => undefined);
            }
        },
    };
}

export type SupportController = ReturnType<typeof useSupportController>;
