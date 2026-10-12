"use client";

import { useSession } from "next-auth/react";
import { useCallback, useRef, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { supportNotificationService } from "@/services/support/supportNotificationService";
import type { SupportNotification } from "@/types/supportNotification";

const QUERY_CONFIG = {
    revalidateOnMount: true,
    revalidateIfStale: true,
    revalidateOnFocus: true,
    refreshInterval: 30000,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    dedupingInterval: 5000,
};

export function useSupportNotifications() {
    const { data: session, status } = useSession();
    const userKey = session?.user?.publicId ?? session?.user?.email;
    const isAdmin = session?.user?.role === "ADMIN";
    const enabled = status === "authenticated" && Boolean(userKey);
    const busyRef = useRef(false);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [isProcessingAll, setIsProcessingAll] = useState(false);

    // 계정과 권한별 캐시로 개인·관리자 알림이 다른 세션에 남지 않게 한다.
    const summaryQuery = useQuery({
        keys: ["support-notification-summary", userKey, isAdmin] as const,
        fetcher: () => supportNotificationService.getSummary(),
        enabled,
        config: QUERY_CONFIG,
    });
    const listQuery = useQuery({
        keys: ["support-notification-list", userKey, isAdmin] as const,
        fetcher: () => supportNotificationService.getList(),
        enabled,
        config: QUERY_CONFIG,
    });
    const mutateSummary = summaryQuery.mutate;
    const mutateList = listQuery.mutate;

    const refresh = useCallback(async () => {
        await Promise.all([
            mutateSummary((current) => current, true),
            mutateList((current) => current, true),
        ]);
    }, [mutateList, mutateSummary]);

    const markAsRead = useCallback(async (item: SupportNotification) => {
        if (item.isRead) {
            return true;
        }
        if (busyRef.current) {
            return false;
        }

        // 중복 클릭을 막고 저장에 성공한 뒤에만 읽음 상태를 반영한다.
        busyRef.current = true;
        setProcessingId(item.id);

        try {
            await supportNotificationService.markAsRead(item.id);
            await refresh();

            return true;
        } catch (error) {
            console.error("고객센터 알림 읽음 처리 실패", error);

            return false;
        } finally {
            busyRef.current = false;
            setProcessingId(null);
        }
    }, [refresh]);

    const markAllAsRead = useCallback(async () => {
        if (busyRef.current) {
            return false;
        }

        // 현재 목록 밖의 알림도 처리하므로 서버 집계와 목록을 함께 갱신한다.
        busyRef.current = true;
        setIsProcessingAll(true);

        try {
            await supportNotificationService.markAllAsRead();
            await refresh();

            return true;
        } catch (error) {
            console.error("고객센터 알림 전체 읽음 처리 실패", error);

            return false;
        } finally {
            busyRef.current = false;
            setIsProcessingAll(false);
        }
    }, [refresh]);

    return {
        items: listQuery.data?.items ?? [],
        unreadCount: summaryQuery.data?.count ?? 0,
        hasMore: (listQuery.data?.totalPages ?? 0) > 1,
        isLoading: listQuery.isLoading,
        error: listQuery.isError ?? summaryQuery.isError,
        processingId,
        isProcessingAll,
        markAsRead,
        markAllAsRead,
        refresh,
    };
}
