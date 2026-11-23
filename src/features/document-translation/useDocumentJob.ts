import { useEffect, useRef, useState } from "react";

import { useRouter } from "@/navigation";
import {
    cancelDocumentJob,
    DocumentRequestError,
    isUncertainDocumentMutation,
    readDocumentJob,
    readDocumentResult,
    retryDocumentJob,
} from "@/services/document-translation/documentTranslationService";

import { documentJobPath, documentResultFileName, isActiveDocumentJob, type DocumentJob } from "./model";

type Action = "cancel" | "retry" | "download";

// 사용자 에이전트에 넘긴 뒤 URL을 지워 파일 데이터가 화면에 계속 남지 않게 한다.
function handOffToBrowser(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    try {
        link.click();
    } finally {
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    }
}

/** 상태 조회·취소·재시도·전체 다운로드를 현재 작업과 로그인 세션에 귀속한다. */
export function useDocumentJob(jobId: string, loginSessionId: string) {
    const router = useRouter();
    const [job, setJob] = useState<DocumentJob>();
    const [statusError, setStatusError] = useState<string>();
    const [actionError, setActionError] = useState<string>();
    const [action, setAction] = useState<Action>();
    const [retryAt, setRetryAt] = useState<number>();
    const [downloaded, setDownloaded] = useState(false);
    const [revision, setRevision] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const pending = useRef<AbortController | null>(null);
    const retryKey = useRef<string | null>(null);
    const pollRetryAt = useRef<number | undefined>(undefined);
    const pausesPolling = action === "cancel" || action === "retry";

    useEffect(() => () => pending.current?.abort(), []);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1_000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (pausesPolling) {
            return;
        }

        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        let failures = 0;

        // 한 번에 한 상태 요청만 보낸다. 서버 정지 상태에 도달하면 자동 조회를 멈춘다.
        async function readStatus() {
            let delay = 2_000;
            try {
                const snapshot = await readDocumentJob(jobId, { loginSessionId, signal: controller.signal });
                controller.signal.throwIfAborted();
                setJob(snapshot);
                setStatusError(undefined);
                pollRetryAt.current = undefined;
                failures = 0;
                if (!isActiveDocumentJob(snapshot.status)) {
                    return;
                }
            } catch (failure) {
                if (controller.signal.aborted || (failure instanceof DOMException && failure.name === "AbortError")) {
                    return;
                }
                failures++;
                const apiError = failure instanceof DocumentRequestError ? failure : undefined;
                setStatusError(apiError?.code ?? "NETWORK");
                pollRetryAt.current = apiError?.retryAt;

                // 권한·존재 오류에는 이전 응답을 숨기고, 연결 오류에만 백오프한다.
                if (apiError && apiError.status < 500 && apiError.status !== 429) {
                    setJob(undefined);
                    return;
                }
                delay = Math.max(
                    Math.min(2_000 * 2 ** failures, 30_000),
                    (apiError?.retryAt ?? 0) - Date.now(),
                );
            }
            timer = setTimeout(() => void readStatus(), delay);
        }

        // 수동 상태 확인도 서버가 지정한 대기 시간을 앞당기지 않는다.
        const firstDelay = Math.max(revision === 0 ? 1_000 : 0, (pollRetryAt.current ?? 0) - Date.now());
        timer = setTimeout(() => void readStatus(), firstDelay);
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [jobId, loginSessionId, pausesPolling, revision]);

    // 서버 상태가 바뀌었거나 사용자가 다시 요청한 경우 현재 작업을 즉시 읽는다.
    function refresh() {
        setStatusError(undefined);
        setRevision((previous) => previous + 1);
    }

    // 제어 요청은 서로 겹치지 않고, 브라우저에 파일을 넘기기 직전에 세션 취소를 다시 확인한다.
    async function execute(nextAction: Action) {
        if (!job || pending.current || (retryAt !== undefined && retryAt > Date.now())) {
            return;
        }
        const controller = new AbortController();
        pending.current = controller;
        setAction(nextAction);
        setActionError(undefined);
        const request = { loginSessionId, signal: controller.signal };

        try {
            if (nextAction === "download") {
                setDownloaded(false);
                const blob = await readDocumentResult(job, request);
                controller.signal.throwIfAborted();
                handOffToBrowser(blob, documentResultFileName(job));
                setDownloaded(true);
            } else if (nextAction === "cancel") {
                const updated = await cancelDocumentJob(jobId, request);
                controller.signal.throwIfAborted();
                setJob(updated);
                refresh();
            } else {
                const key = retryKey.current ??= crypto.randomUUID();
                const created = await retryDocumentJob(jobId, key, request);
                controller.signal.throwIfAborted();
                router.push(documentJobPath(created.jobId));
            }
        } catch (failure) {
            if (!controller.signal.aborted) {
                const apiError = failure instanceof DocumentRequestError ? failure : undefined;
                if (nextAction === "retry" && !isUncertainDocumentMutation(failure)) {
                    retryKey.current = null;
                }
                setActionError(apiError?.code ?? (nextAction === "download" ? "INCOMPLETE_DOWNLOAD" : "NETWORK"));
                setRetryAt(apiError?.retryAt);
                if (apiError?.status === 409 || apiError?.status === 410) {
                    refresh();
                }
            }
        } finally {
            if (!controller.signal.aborted) {
                pending.current = null;
                setAction(undefined);
            }
        }
    }

    return {
        job, statusError, actionError, action, now, downloaded, refresh, execute,
        waitBeforeAction: retryAt !== undefined && retryAt > now,
    };
}
