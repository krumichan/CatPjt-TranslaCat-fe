import { apiClient } from "@/lib/apiClient";
import type { DocumentJob, DocumentUpload } from "@/features/document-translation/model";

type DocumentRequest = { loginSessionId: string; signal: AbortSignal };

const DOCUMENT_API_PATH = "/document-translations";

/** HTTP 실패 코드와 서버가 제시한 재시도 시점을 UI에 전달한다. */
export class DocumentRequestError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        readonly retryAt: number | undefined = undefined,
    ) {
        super(code);
        this.name = "DocumentRequestError";
    }
}

// Retry-After의 초 단위와 HTTP 날짜를 모두 절대 시각으로 바꾼다.
function readRetryAt(value: string | null): number | undefined {
    if (!value) {
        return undefined;
    }

    const time = /^\d+$/.test(value) ? Date.now() + Number(value) * 1_000 : Date.parse(value);
    return Number.isFinite(time) ? time : undefined;
}

// 로그인 세션을 고정한 채 원시 응답을 받고 실패 응답의 기계 판정용 코드만 읽는다.
async function requestDocument(
    path: string,
    options: RequestInit,
    request: DocumentRequest,
    timeoutMs = 20_000,
): Promise<Response> {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]);
    const response = await apiClient(path, { ...options, signal, cache: "no-store" }, request.loginSessionId);
    if (response.ok) {
        return response;
    }

    // 인증 필터나 프록시에서 빈 오류 본문을 반환해도 HTTP 상태를 유지한다.
    const body = await response.json().catch(() => null) as { code?: unknown } | null;
    const code = typeof body?.code === "string" ? body.code : "HTTP_" + response.status;
    throw new DocumentRequestError(response.status, code, readRetryAt(response.headers.get("Retry-After")));
}

/** 완료 여부가 불확실한 변경 요청의 키를 같은 입력에 재사용할지 판정한다. */
export function isUncertainDocumentMutation(error: unknown): boolean {
    return !(error instanceof DocumentRequestError) || error.status === 429 || error.status >= 500;
}

/** 문서와 언어 조합을 멀티파트로 제출하고 원시 작업 객체를 반환한다. */
export async function createDocumentJob(input: DocumentUpload, key: string, request: DocumentRequest): Promise<DocumentJob> {
    const body = new FormData();
    body.set("file", input.file);
    body.set("sourceLanguage", input.sourceLanguage);
    body.set("targetLanguage", input.targetLanguage);

    // apiClient가 브라우저의 multipart boundary를 유지한다.
    const response = await requestDocument(DOCUMENT_API_PATH, {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body,
    }, request, 120_000);
    return response.json() as Promise<DocumentJob>;
}

/** 현재 로그인 세션에서 작업의 저장 상태를 조회한다. */
export async function readDocumentJob(jobId: string, request: DocumentRequest): Promise<DocumentJob> {
    const response = await requestDocument(DOCUMENT_API_PATH + "/" + encodeURIComponent(jobId), {}, request);
    return response.json() as Promise<DocumentJob>;
}

/** 실행 중인 작업에 취소를 요청하고 BE 상태를 반환한다. */
export async function cancelDocumentJob(jobId: string, request: DocumentRequest): Promise<DocumentJob> {
    const response = await requestDocument(DOCUMENT_API_PATH + "/" + encodeURIComponent(jobId) + "/cancel", {
        method: "POST",
    }, request);
    return response.json() as Promise<DocumentJob>;
}

/** 동일 원본으로 새 작업을 만들되 불확실한 재전송에는 동일 키를 사용한다. */
export async function retryDocumentJob(jobId: string, key: string, request: DocumentRequest): Promise<DocumentJob> {
    const response = await requestDocument(DOCUMENT_API_PATH + "/" + encodeURIComponent(jobId) + "/retry", {
        method: "POST",
        headers: { "Idempotency-Key": key },
    }, request);
    return response.json() as Promise<DocumentJob>;
}

/** 해당 작업의 인증된 전체 파일을 받아 브라우저에 넘기기 전에 길이를 검증한다. */
export async function readDocumentResult(job: DocumentJob, request: DocumentRequest): Promise<Blob> {
    const path = DOCUMENT_API_PATH + "/" + encodeURIComponent(job.jobId) + "/download";
    const response = await requestDocument(path, {}, request, 180_000);

    // 부분 전송, 빈 응답 또는 길이 불일치 파일은 저장 동작을 실행하지 않는다.
    const blob = await response.blob();
    request.signal.throwIfAborted();
    const length = response.headers.get("Content-Length");
    const expected = job.outputSizeBytes ?? (length !== null ? Number(length) : undefined);
    if (response.status !== 200 || blob.size === 0 || (expected !== undefined && expected !== blob.size)) {
        throw new DocumentRequestError(response.status, "INCOMPLETE_DOWNLOAD");
    }

    return blob;
}
