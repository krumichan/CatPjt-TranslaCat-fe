import { apiClient } from "@/lib/apiClient";
import type { CreateImageJob, ImageJob, ImagePage, ImageUpload } from "@/features/image-translation/model";

const JOBS_PATH = "/image-translation/jobs";
const UPLOAD_SLOTS = 4;

export class ImageTranslationRequestError extends Error {
    readonly status: number;
    readonly code?: string;
    readonly retryAfterSeconds?: number;

    /** 이 작업의 실패 코드를 사용자 메시지와 재조회 여부 결정에 사용한다. */
    constructor(status: number, code?: string, retryAfterSeconds?: number) {
        super(code ?? String(status));
        this.name = "ImageTranslationRequestError";
        this.status = status;
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

type ImageRequest = { signal: AbortSignal; sessionId?: string };
type JobAction = "prepare" | "start" | "cancel" | "retry";
type PageActionBody = { pageIds: string[]; revision: number };

// 공용 인증을 통해 같은 세션의 BE 응답만 받고 화면에는 서버의 내부 오류 본문을 전달하지 않는다.
async function readImageResponse<T>(path: string, init: RequestInit, request: ImageRequest): Promise<T> {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
    const response = await apiClient(path, { ...init, signal, cache: "no-store" }, request.sessionId);
    const envelope = await response.json().catch(() => null) as { body?: (T & { errorCode?: string }) | null } | null;

    if (!response.ok || !envelope?.body) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        throw new ImageTranslationRequestError(
            response.ok ? 502 : response.status,
            envelope?.body?.errorCode,
            Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
        );
    }
    return envelope.body;
}

/** 파일·ZIP·허용 링크에 대한 작업과 필요한 업로드 티켓을 만든다. */
export function createImageJob(payload: CreateImageJob, key: string, request: ImageRequest): Promise<ImageJob> {
    return readImageResponse(JOBS_PATH, {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify(payload),
    }, request);
}

/** 소유한 작업의 최신 상태를 조회한다. */
export function getImageJob(jobId: string, request: ImageRequest): Promise<ImageJob> {
    return readImageResponse(`${JOBS_PATH}/${jobId}`, {}, request);
}

/** 비동기 준비·실행·취소·재시도를 동일한 작업 API에 보낸다. */
export function changeImageJob(
    jobId: string,
    action: JobAction,
    key: string,
    request: ImageRequest,
    body?: PageActionBody,
): Promise<ImageJob> {
    return readImageResponse(`${JOBS_PATH}/${jobId}/${action}`, {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: body ? JSON.stringify(body) : undefined,
    }, request);
}

/** 원본 열람 주소와 OCR·번역 결과를 조회한다. */
export function getImagePage(jobId: string, pageId: string, request: ImageRequest): Promise<ImagePage> {
    return readImageResponse(`${JOBS_PATH}/${jobId}/pages/${pageId}`, {}, request);
}

// 서명된 객체 주소에는 사용자 세션의 헤더나 쿠키를 사용하지 않는다.
async function putImageUpload(ticket: ImageUpload, file: File, signal: AbortSignal): Promise<void> {
    const url = new URL(ticket.url);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))) {
        throw new ImageTranslationRequestError(400, "INVALID_UPLOAD_URL");
    }
    if (Date.parse(ticket.expiresAt) <= Date.now()) {
        throw new ImageTranslationRequestError(410, "UPLOAD_EXPIRED");
    }

    // 서명된 요청 헤더를 그대로 전달하되 사용자 세션이나 리퍼러는 전송하지 않는다.
    const response = await fetch(url, {
        method: "PUT",
        headers: ticket.headers,
        body: file,
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.any([signal, AbortSignal.timeout(180_000)]),
    });
    if (!response.ok) throw new ImageTranslationRequestError(response.status, "UPLOAD_FAILED");
}

/** 티켓과 파일이 정확히 대응할 때만 제한된 병렬 수로 업로드하고 완료 수를 알린다. */
export async function uploadImageFiles(
    tickets: ImageUpload[],
    files: Map<string, File>,
    signal: AbortSignal,
    onProgress: (completed: number) => void,
): Promise<void> {
    const uploadIds = new Set(tickets.map((ticket) => ticket.clientFileId));
    if (tickets.length !== files.size || uploadIds.size !== files.size || [...files.keys()].some((id) => !uploadIds.has(id))) {
        throw new ImageTranslationRequestError(502, "MISSING_UPLOAD_TICKET");
    }

    // 현재 배치의 성공과 실패를 모두 확인한 뒤에만 다음 전송을 시작한다.
    let completed = 0;
    for (let index = 0; index < tickets.length; index += UPLOAD_SLOTS) {
        const group = tickets.slice(index, index + UPLOAD_SLOTS);
        const results = await Promise.allSettled(group.map(async (ticket) => {
            const file = files.get(ticket.clientFileId);
            if (!file) throw new ImageTranslationRequestError(502, "MISSING_UPLOAD_TICKET");
            await putImageUpload(ticket, file, signal);
            completed += 1;
            onProgress(completed);
        }));
        const failed = results.find((result) => result.status === "rejected");
        if (failed) throw failed.reason;
    }
}
