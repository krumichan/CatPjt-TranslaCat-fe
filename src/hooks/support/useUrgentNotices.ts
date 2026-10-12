"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
    closedUrgentNoticeSnapshot,
    closeUrgentNoticeForLogin,
    subscribeUrgentNoticeClosures,
    urgentNoticeScope,
} from "@/features/support/urgentNoticeSession";
import { useQuery } from "@/hooks/useQuery";
import { supportService } from "@/services/support/supportService";

export function useUrgentNotices(owner: string, loginSessionId: string) {
    const scope = urgentNoticeScope(owner, loginSessionId);
    const mounted = useRef(true);
    const pending = useRef(false);
    const [isSaving, setSaving] = useState(false);
    const [failedNoticeId, setFailedNoticeId] = useState<number | null>(null);
    const subscribe = useCallback((listener: () => void) => subscribeUrgentNoticeClosures(scope, listener), [scope]);
    const getSnapshot = useCallback(() => closedUrgentNoticeSnapshot(scope), [scope]);
    const closedSnapshot = useSyncExternalStore(subscribe, getSnapshot, () => "");
    const closedIds = new Set(closedSnapshot.split(","));

    // 로그인마다 별도 캐시를 사용해 재로그인 시 다시 조회하고 다른 계정의 응답을 분리한다.
    const query = useQuery({
        keys: ["support-urgent-notices", owner, loginSessionId] as const,
        fetcher: () => supportService.listUrgentNotices(AbortSignal.timeout(10000), loginSessionId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: false,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            errorRetryCount: 2,
            errorRetryInterval: 3000,
            keepPreviousData: false,
        },
    });
    const notices = (query.data ?? []).filter((item) => item.noticeType === "URGENT" && !closedIds.has(String(item.id)));
    const notice = notices[0] ?? null;

    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;
        };
    }, []);

    const close = useCallback(() => {
        if (notice && !pending.current) {
            closeUrgentNoticeForLogin(scope, notice.id);
        }
    }, [notice, scope]);

    const dismiss = useCallback(async () => {
        if (!notice || pending.current) {
            return;
        }

        // 서버 저장에 성공한 경우에만 숨겨 실패한 선택을 영구 저장으로 오인하지 않게 한다.
        pending.current = true;
        setSaving(true);
        setFailedNoticeId(null);

        try {
            const saved = await supportService.dismissUrgentNotice(notice.id, loginSessionId);

            if (!saved) {
                throw new Error("긴급 공지 숨김 설정이 저장되지 않았습니다.");
            }

            if (mounted.current) {
                closeUrgentNoticeForLogin(scope, notice.id);
            }
        } catch {
            if (mounted.current) {
                setFailedNoticeId(notice.id);
            }
        } finally {
            pending.current = false;

            if (mounted.current) {
                setSaving(false);
            }
        }
    }, [notice, loginSessionId, scope]);

    return {
        notice,
        remaining: notices.length,
        isSaving,
        hasError: notice !== null && failedNoticeId === notice.id,
        close,
        dismiss,
    };
}
