"use client";

import { useEffect, useRef, useState } from "react";

import {
    changeImageJob,
    createImageJob,
    getImageJob,
    ImageTranslationRequestError,
    uploadImageFiles,
} from "@/services/image-translation/imageTranslationService";

import { isImageJobPolling, type CreateImageJob, type ImageJob, type InputSelection } from "./model";

type JobAction = "prepare" | "start" | "cancel" | "retry";
type ActionBody = { pageIds: string[]; revision: number };

type ReadFailure = { type: "read"; error: unknown };
type WorkFailure = { type: "action" | "upload"; error: unknown };

type UploadProgress = { done: number; total: number };

// URL에는 결과나 개인 정보를 저장하지 않고 현재 소유자 작업의 식별자만 남긴다.
function updateJobUrl(jobId?: string) {
    const url = new URL(window.location.href);
    if (jobId) url.searchParams.set("job", jobId);
    else url.searchParams.delete("job");
    window.history.replaceState(null, "", url);
}

// HTTP 오류나 계정 변경 이후에는 이전 백오프 상태를 이어가지 않는다.
function isAborted(signal: AbortSignal, error: unknown): boolean {
    return signal.aborted || (error instanceof DOMException && error.name === "AbortError");
}

// 재시도 전에 응답을 잃었을 수 있는 요청인지 구분한다.
function isAmbiguous(error: unknown): boolean {
    return !(error instanceof ImageTranslationRequestError) || error.status === 429 || error.status >= 500;
}

/** 업로드·작업 진행·복귀를 한 로그인 세션과 작업 ID 안에서 관리한다. */
export function useImageJob(initialJobId: string | undefined, sessionId: string | undefined) {
    const [jobId, setJobId] = useState(initialJobId);
    const [job, setJob] = useState<ImageJob>();
    const [refresh, setRefresh] = useState(0);
    const [busy, setBusy] = useState(false);
    const [readFailure, setReadFailure] = useState<ReadFailure>();
    const [workFailure, setWorkFailure] = useState<WorkFailure>();
    const [uploadProgress, setUploadProgress] = useState<UploadProgress>();
    const activeWork = useRef<AbortController | null>(null);
    const currentJobId = useRef(initialJobId);
    const requestKeys = useRef(new Map<string, string>());
    const shouldPoll = isImageJobPolling(job?.status);

    // 화면을 닫거나 로그인 세션이 바뀌면 미완료 업로드와 상태 변경 요청을 중단한다.
    useEffect(() => () => activeWork.current?.abort(), []);

    useEffect(() => {
        if (!jobId) return;
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        let failures = 0;

        // 상태 조회는 한 번에 하나씩 수행하고 다른 작업의 응답이나 오래된 리비전은 버린다.
        async function readStatus(id: string) {
            let interval = 1_000;
            try {
                const result = await getImageJob(id, { sessionId, signal: controller.signal });
                if (controller.signal.aborted || currentJobId.current !== result.jobId) return;
                setJob((previous) => previous && previous.revision > result.revision ? previous : result);
                setReadFailure(undefined);
                failures = 0;
                if (!isImageJobPolling(result.status) && !shouldPoll) return;
            } catch (error) {
                if (isAborted(controller.signal, error) || currentJobId.current !== id) return;
                setReadFailure({ type: "read", error });
                failures += 1;

                // 권한·소유권·만료 오류는 재조회하지 않는다. 불안정한 연결은 제한적으로 다시 읽는다.
                const status = error instanceof ImageTranslationRequestError ? error.status : undefined;
                if (status === 401 || status === 403 || status === 404 || status === 410) {
                    setJob(undefined);
                    return;
                }
                if (!shouldPoll && failures >= 3) return;
                const wait = error instanceof ImageTranslationRequestError ? error.retryAfterSeconds : undefined;
                interval = wait ? Math.min(wait, 60) * 1_000 : Math.min(1_000 * 2 ** failures, 15_000);
            }

            timer = setTimeout(() => void readStatus(id), interval);
        }

        void readStatus(jobId);
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [jobId, refresh, sessionId, shouldPoll]);

    // 사용자가 작업을 명시적으로 다시 열면 이전 요청의 실패를 숨기고 최신 상태를 읽는다.
    function refreshJob() {
        setReadFailure(undefined);
        setRefresh((value) => value + 1);
    }

    // 전송, 시작, 취소를 겹쳐 보내지 않고 현재 세션에 귀속시킨다.
    function beginWork(): AbortController | undefined {
        if (activeWork.current) return;
        const controller = new AbortController();
        activeWork.current = controller;
        setWorkFailure(undefined);
        setBusy(true);
        return controller;
    }

    // 먼저 완료된 상태 조회가 있으면 수정 응답이 이전 리비전으로 되돌리지 않게 한다.
    function publish(snapshot: ImageJob) {
        setJob((previous) => (
            previous?.jobId === snapshot.jobId && previous.revision > snapshot.revision ? previous : snapshot
        ));
    }

    // 네트워크 결과가 불확실한 경우 같은 작업·본문에 멱등 키를 재사용한다.
    async function sendMutation(scope: string, run: (key: string) => Promise<ImageJob>): Promise<ImageJob> {
        let key = requestKeys.current.get(scope);
        if (!key) {
            key = crypto.randomUUID();
            requestKeys.current.set(scope, key);
        }

        try {
            const response = await run(key);
            requestKeys.current.delete(scope);
            return response;
        } catch (error) {
            if (!isAmbiguous(error)) requestKeys.current.delete(scope);
            throw error;
        }
    }

    // 현재 요청이 관리하는 부수 상태만 마무리한다.
    function finishWork(controller: AbortController) {
        if (activeWork.current !== controller) return;
        activeWork.current = null;
        if (!controller.signal.aborted) setBusy(false);
    }

    // 멱등 작업을 준비한 뒤 해당 티켓으로 현재 입력의 파일만 송신한다.
    async function submit(
        input: InputSelection,
        sourceLanguage: CreateImageJob["sourceLanguage"],
        targetLanguage: CreateImageJob["targetLanguage"],
    ) {
        const controller = beginWork();
        if (!controller) return;
        const request = { sessionId, signal: controller.signal };
        const payload = { source: input.source, sourceLanguage, targetLanguage };
        let stage: WorkFailure["type"] = "action";
        setUploadProgress(undefined);

        try {
            // 안내 확인 전에는 번역을 실행하지 않는다. 링크는 서버가 직접 준비한다.
            const created = await sendMutation(JSON.stringify(payload), (key) => createImageJob(payload, key, request));
            request.signal.throwIfAborted();
            currentJobId.current = created.jobId;
            setJobId(created.jobId);
            publish(created);
            updateJobUrl(created.jobId);
            if (input.source.kind === "LINK") return;

            // 업로드 완료 후 서버가 원본을 검증하고 페이지 후보를 만든다.
            stage = "upload";
            setUploadProgress({ done: 0, total: input.files.size });
            await uploadImageFiles(created.uploads ?? [], input.files, request.signal, (done) => {
                if (!request.signal.aborted) setUploadProgress({ done, total: input.files.size });
            });
            stage = "action";
            const prepared = await sendMutation(created.jobId + "/prepare", (key) => (
                changeImageJob(created.jobId, "prepare", key, request)
            ));
            request.signal.throwIfAborted();
            publish(prepared);
        } catch (error) {
            if (!isAborted(request.signal, error)) setWorkFailure({ type: stage, error });
        } finally {
            finishWork(controller);
        }
    }

    // 선택한 상태 변경을 현재 작업에 적용하고 서버가 반환한 리비전을 이어간다.
    async function act(action: JobAction, body?: ActionBody) {
        if (!job) return;
        const controller = beginWork();
        if (!controller) return;
        const request = { sessionId, signal: controller.signal };

        // 짧은 재요청에는 키를 공유하고 리비전 충돌의 경우 서버의 최신 상태를 적용한다.
        const scope = job.jobId + "/" + action + (body ? JSON.stringify(body) : "");
        try {
            const result = await sendMutation(scope, (key) => changeImageJob(job.jobId, action, key, request, body));
            if (currentJobId.current === result.jobId && !request.signal.aborted) publish(result);
        } catch (error) {
            if (isAborted(request.signal, error)) return;
            setWorkFailure({ type: "action", error });
            if (error instanceof ImageTranslationRequestError && error.status === 409) refreshJob();
        } finally {
            finishWork(controller);
        }
    }

    // 새 작업에서는 이전 요청 키와 진행 상태를 남기지 않는다.
    function resetJob() {
        currentJobId.current = undefined;
        setJobId(undefined);
        setJob(undefined);
        setReadFailure(undefined);
        setWorkFailure(undefined);
        setUploadProgress(undefined);
        requestKeys.current.clear();
        updateJobUrl();
    }

    return { jobId, job, busy, readFailure, workFailure, uploadProgress, submit, act, resetJob, refreshJob };
}
