import { useCallback, useEffect, useRef, useState } from "react";
import { getSession } from "next-auth/react";

import { isTemporaryAuthError, isTerminalAuthError } from "@/lib/authError";
import { useRouter } from "@/navigation";
import {
    cancelDocumentJob,
    DocumentRequestError,
    isUncertainDocumentMutation,
    readDocumentJob,
    readDocumentResult,
    retryDocumentJob,
} from "@/services/document-translation/documentTranslationService";

import {
    documentJobPath,
    documentResultFileName,
    isActiveDocumentJob,
    type DocumentJob,
    type DocumentJobStatus,
} from "./model";
import { takeDocumentFileName } from "./pendingDocumentFileName";

type ControlAction = "cancel" | "retry";
type Action = ControlAction | "download" | "save";
type BufferedDownload = { blob: Blob; fileName: string; expiresAt: number; timer: number };
const SAVE_FALLBACK_MS = 30_000;

// locale 변경과 주소 끝의 슬래시가 있어도 같은 작업 화면이면 그대로 둔다.
function isOnProgressPath(jobId: string): boolean {
    return window.location.pathname.replace(/\/$/, "").endsWith(documentJobPath(jobId));
}

// 사용자 에이전트에 넘긴 뒤 URL을 지워 파일 데이터가 화면에 계속 남지 않게 한다.
function handOffToBrowser(blob: Blob, filename: string, activeUrls: Set<string>) {
    const url = URL.createObjectURL(blob);
    activeUrls.add(url);
    window.setTimeout(() => {
        if (activeUrls.delete(url)) {
            URL.revokeObjectURL(url);
        }
    }, 1_000);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    try {
        document.body.append(link);
        link.click();
    } finally {
        link.remove();
    }
}

// 파일을 넘기기 직전에 현재 인증 응답을 읽고 기존 작업 화면의 세션과 대조한다.
async function hasLiveDocumentSession(loginSessionId: string, signal: AbortSignal): Promise<boolean> {
    signal.throwIfAborted();
    const session = await getSession();
    signal.throwIfAborted();
    if (!session || session.loginSessionId !== loginSessionId || !session.accessToken
        || isTerminalAuthError(session.error)) {
        return false;
    }
    return !isTemporaryAuthError(session.error)
        || (session.user?.accessTokenExpires ?? 0) > Date.now();
}

/** 현재 작업과 로그인 세션을 조회하고 준비된 일회성 결과를 브라우저에 넘긴다. */
export function useDocumentJob(jobId: string, loginSessionId: string) {
    const router = useRouter();
    const [job, setJob] = useState<DocumentJob>();
    const [statusError, setStatusError] = useState<string>();
    const [actionError, setActionError] = useState<string>();
    const [action, setAction] = useState<Action>();
    const [retryAt, setRetryAt] = useState<number>();
    const [downloadState, setDownloadState] = useState<"received" | "requested">();
    const [canSaveFallback, setCanSaveFallback] = useState(false);
    const [revision, setRevision] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const pending = useRef<AbortController | null>(null);
    const retryKey = useRef<string | null>(null);
    const pollRetryAt = useRef<number | undefined>(undefined);
    const latestStatus = useRef<DocumentJobStatus | undefined>(undefined);
    const originalFileName = useRef<string | undefined>(undefined);
    const downloadAttempted = useRef(false);
    const bufferedDownload = useRef<BufferedDownload | undefined>(undefined);
    const activeObjectUrls = useRef(new Set<string>());
    const pausesPolling = action === "cancel" || action === "retry";

    // 브라우저 저장 재요청에만 쓸 바이트와 만료 타이머를 작업 화면에서 버린다.
    const discardBufferedDownload = useCallback(() => {
        const entry = bufferedDownload.current;
        if (entry) {
            window.clearTimeout(entry.timer);
            bufferedDownload.current = undefined;
        }
    }, []);

    // 화면이나 세션 범위가 끝나면 브라우저에 건넸던 임시 URL도 즉시 해제한다.
    const discardPageDownload = useCallback(() => {
        discardBufferedDownload();
        for (const url of activeObjectUrls.current) {
            URL.revokeObjectURL(url);
        }
        activeObjectUrls.current.clear();
    }, [discardBufferedDownload]);

    useEffect(() => {
        originalFileName.current ??= takeDocumentFileName(jobId, loginSessionId);
        const wasOnProgressPath = isOnProgressPath(jobId);

        // 문서가 닫히거나 브라우저 기록에 숨겨지면 작업 화면의 전체 파일도 버린다.
        function onPageHide() {
            pending.current?.abort();
            pending.current = null;
            originalFileName.current = undefined;
            discardPageDownload();
            setCanSaveFallback(false);
            setAction(undefined);
        }
        window.addEventListener("pagehide", onPageHide);

        return () => {
            window.removeEventListener("pagehide", onPageHide);
            const actionPending = pending.current !== null;
            pending.current?.abort();
            discardPageDownload();
            const status = latestStatus.current;
            if (!wasOnProgressPath || actionPending || !status
                || !isActiveDocumentJob(status) || status === "CANCELLING") {
                return;
            }

            // 경로가 실제로 바뀐 UI 이동만 취소한다. 새로고침이나 세션 전환에는 TTL을 사용한다.
            queueMicrotask(() => {
                if (!isOnProgressPath(jobId)) {
                    void cancelDocumentJob(jobId, {
                        loginSessionId,
                        signal: AbortSignal.timeout(3_000),
                    }).catch(() => undefined);
                }
            });
        };
    }, [discardPageDownload, jobId, loginSessionId]);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1_000);
        return () => clearInterval(timer);
    }, []);

    // 결과를 요청하기 전에 시도를 표시한다. 응답을 잃어도 같은 결과를 다시 요청하지 않는다.
    const download = useCallback(async (snapshot: DocumentJob) => {
        if (snapshot.jobId !== jobId || snapshot.status !== "SUCCEEDED" || !snapshot.downloadPath
            || Date.now() >= Date.parse(snapshot.expiresAt) || !isOnProgressPath(jobId)
            || downloadAttempted.current || pending.current) {
            return;
        }
        downloadAttempted.current = true;
        const controller = new AbortController();
        pending.current = controller;
        const fileName = originalFileName.current ?? snapshot.fileName;
        originalFileName.current = undefined;
        setAction("download");
        setActionError(undefined);

        // 전체 본문 검사 후 인증을 다시 확인하는 동안에도 화면이 바이트를 버릴 수 있게 한다.
        try {
            const request = { loginSessionId, signal: controller.signal };
            await readDocumentResult(snapshot, request).then((blob) => {
                controller.signal.throwIfAborted();
                if (!isOnProgressPath(jobId)) {
                    return;
                }
                const expiresAt = Date.now() + SAVE_FALLBACK_MS;
                const timer = window.setTimeout(() => {
                    discardBufferedDownload();
                    setCanSaveFallback(false);
                }, SAVE_FALLBACK_MS);
                bufferedDownload.current = {
                    blob,
                    fileName: documentResultFileName({ ...snapshot, fileName }),
                    expiresAt,
                    timer,
                };
            });
            if (!bufferedDownload.current) {
                return;
            }

            const authenticated = await hasLiveDocumentSession(loginSessionId, controller.signal);
            controller.signal.throwIfAborted();
            const received = bufferedDownload.current;
            if (!authenticated || !isOnProgressPath(jobId) || !received || Date.now() >= received.expiresAt) {
                discardPageDownload();
                setActionError("DOWNLOAD_UNAVAILABLE");
                return;
            }

            // 실제 디스크 저장 여부는 알 수 없다. 자동 요청 후에는 짧게 한 번의 사용자 저장만 허용한다.
            setDownloadState("received");
            try {
                handOffToBrowser(received.blob, received.fileName, activeObjectUrls.current);
                setDownloadState("requested");
            } catch {
                // 자동 클릭이 실패하면 같은 화면의 수동 저장만 남긴다.
            }
            setCanSaveFallback(true);
        } catch (failure) {
            discardBufferedDownload();
            if (!controller.signal.aborted) {
                const error = failure instanceof DocumentRequestError ? failure : undefined;
                setActionError(error && (error.status === 401 || error.status === 403)
                    ? error.code : "DOWNLOAD_UNAVAILABLE");
            }
        } finally {
            if (!controller.signal.aborted) {
                pending.current = null;
                setAction(undefined);
            }
        }
    }, [discardBufferedDownload, discardPageDownload, jobId, loginSessionId]);

    // 자동 저장이 시작되지 않았을 때 받은 바이트를 같은 사용자에게 한 번만 넘긴다.
    async function saveFallback() {
        if (!canSaveFallback || !bufferedDownload.current || pending.current || !isOnProgressPath(jobId)) {
            return;
        }
        const controller = new AbortController();
        pending.current = controller;
        setAction("save");
        setCanSaveFallback(false);

        try {
            const authenticated = await hasLiveDocumentSession(loginSessionId, controller.signal);
            controller.signal.throwIfAborted();
            const received = bufferedDownload.current;
            if (!authenticated || !isOnProgressPath(jobId) || !received || Date.now() >= received.expiresAt) {
                discardPageDownload();
                setActionError("DOWNLOAD_UNAVAILABLE");
                return;
            }
            // 인증 확인 중 클릭의 사용자 활성 상태가 끝났으면 기존 만료 시각까지 다시 누를 수 있다.
            if (navigator.userActivation?.isActive === false) {
                setCanSaveFallback(true);
                return;
            }

            handOffToBrowser(received.blob, received.fileName, activeObjectUrls.current);
            discardBufferedDownload();
            setDownloadState("requested");
        } catch {
            discardBufferedDownload();
            if (!controller.signal.aborted) {
                setActionError("DOWNLOAD_UNAVAILABLE");
            }
        } finally {
            if (pending.current === controller) {
                pending.current = null;
                setAction(undefined);
            }
        }
    }

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
                latestStatus.current = snapshot.status;
                setJob(snapshot);
                setStatusError(undefined);
                pollRetryAt.current = undefined;
                failures = 0;
                if (!isActiveDocumentJob(snapshot.status)) {
                    void download(snapshot);
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
                    latestStatus.current = undefined;
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
    }, [download, jobId, loginSessionId, pausesPolling, revision]);

    // 서버 상태가 바뀌었거나 사용자가 다시 요청한 경우 현재 작업을 즉시 읽는다.
    function refresh() {
        setStatusError(undefined);
        setRevision((previous) => previous + 1);
    }

    // 취소와 재시도는 자동 다운로드나 다른 제어 요청과 겹치지 않게 한다.
    async function execute(nextAction: ControlAction) {
        if (!job || pending.current || (retryAt !== undefined && retryAt > Date.now())) {
            return;
        }
        const controller = new AbortController();
        pending.current = controller;
        setAction(nextAction);
        setActionError(undefined);
        const request = { loginSessionId, signal: controller.signal };

        try {
            if (nextAction === "cancel") {
                originalFileName.current = undefined;
                discardPageDownload();
                setCanSaveFallback(false);
                const updated = await cancelDocumentJob(jobId, request);
                controller.signal.throwIfAborted();
                latestStatus.current = updated.status;
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
                const sourceUnavailable = nextAction === "retry" && apiError?.status === 410;
                setActionError(sourceUnavailable ? "HTTP_410" : (apiError?.code ?? "NETWORK"));
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
        job, statusError, actionError, action, now, canSaveFallback,
        receivedResult: downloadState !== undefined,
        downloadRequested: downloadState === "requested",
        refresh, execute, saveFallback,
        waitBeforeAction: retryAt !== undefined && retryAt > now,
    };
}
