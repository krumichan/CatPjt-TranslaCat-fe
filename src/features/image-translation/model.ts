export const IMAGE_TRANSLATION_PATH = "/image-translation";
export const IMAGE_TRANSLATION_ENABLED = process.env.NEXT_PUBLIC_IMAGE_TRANSLATION_ENABLED === "true";
export const IMAGE_TRANSLATION_LINKS_ENABLED = process.env.NEXT_PUBLIC_IMAGE_TRANSLATION_LINKS_ENABLED === "true";

export const IMAGE_LANGUAGES = ["ja", "ko", "en"] as const;
export type ImageLanguage = (typeof IMAGE_LANGUAGES)[number];
export type SourceKind = "FILES" | "ZIP" | "LINK";
export type JobStatus = "AWAITING_UPLOAD" | "PREPARING" | "READY" | "QUEUED" | "RUNNING"
    | "SUCCEEDED" | "PARTIAL_FAILED" | "FAILED" | "CANCELLED" | "EXPIRED";
export type PageState = "PENDING" | "RUNNING" | "READY" | "NO_TEXT" | "FAILED" | "CANCELLED";

type UploadFile = {
    clientFileId: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
};

export type JobSource = { kind: "FILES"; files: UploadFile[] }
    | { kind: "ZIP"; archive: UploadFile }
    | { kind: "LINK"; url: string };

export type CreateImageJob = {
    sourceLanguage: ImageLanguage;
    targetLanguage: ImageLanguage;
    source: JobSource;
};

export type ImageUpload = {
    clientFileId: string;
    method: "PUT";
    url: string;
    headers: Record<string, string>;
    expiresAt: string;
};

export type ImageFailure = {
    code: string;
    stage: "ACQUIRE" | "VALIDATE" | "OCR" | "TRANSLATE" | "STORE" | "RENDER";
    retryable: boolean;
};

export type ImagePageSummary = {
    pageId: string;
    order: number;
    state: PageState;
    fileName?: string;
    failure?: ImageFailure;
};

export type ImageAttribution = {
    title: string;
    creator: string;
    sourceURL: string;
    licenseName: string;
    licenseURL: string;
    changes: string;
};

export type ImageJob = {
    jobId: string;
    sourceKind: SourceKind;
    sourceLanguage: ImageLanguage;
    targetLanguage: ImageLanguage;
    status: JobStatus;
    revision: number;
    expiresAt: string;
    uploads?: ImageUpload[];
    pages: ImagePageSummary[];
    counts: Record<"pending" | "running" | "ready" | "noText" | "failed" | "cancelled", number>;
    inputIssues: { fileName: string; code: string }[];
    failure?: ImageFailure;
    attribution?: ImageAttribution;
};

export type ImageSegment = {
    segmentId: string;
    readingOrder: number;
    sourceText: string;
    translatedText: string | null;
    polygon: [number, number][];
    confidence: number | null;
    writingMode: "horizontal-ltr" | "horizontal-rtl" | "vertical-ltr" | "vertical-rtl" | "unknown";
    needsReview: boolean;
};

export type ImagePage = ImagePageSummary & {
    originalURL?: string;
    assetExpiresAt?: string;
    widthPx?: number;
    heightPx?: number;
    ocrContractVersion?: 1;
    segments: ImageSegment[];
};

export type InputSelection = { source: JobSource; files: Map<string, File> };
export type InputError = "fileCount" | "fileType" | "fileSize" | "archiveCount" | "linkInvalid" | "languagePair";

const MAX_IMAGE_COUNT = 100;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_SOURCE_BYTES = 100 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

const POLLING_STATES: ReadonlySet<JobStatus> = new Set(["PREPARING", "QUEUED", "RUNNING"]);
const WAITING_STATES: ReadonlySet<JobStatus> = new Set(["AWAITING_UPLOAD", "PREPARING", "READY", "QUEUED", "RUNNING"]);

/** 로그인한 사용자가 이전 작업을 복원할 때만 안전한 작업 ID를 넘긴다. */
export function parseImageJobId(value: unknown): string | undefined {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return typeof value === "string" && pattern.test(value) ? value.toLowerCase() : undefined;
}

/** 서버에서 진행 중인 작업을 계속 조회할지 판정한다. */
export function isImageJobPolling(status: JobStatus | undefined): boolean {
    return status !== undefined && POLLING_STATES.has(status);
}

/** 실행이 끝난 상태에는 취소를 노출하지 않는다. */
export function canCancelImageJob(status: JobStatus): boolean {
    return WAITING_STATES.has(status);
}

/** 입수 방식에 맞는 요청과 실제 파일의 연결을 만든다. 실패 코드는 화면에서 번역한다. */
export function prepareInputSelection(kind: SourceKind, files: File[], rawLink: string): InputSelection | InputError {
    if (kind === "LINK") {
        // 브라우저는 명백히 잘못된 주소만 거절한다. 플랫폼 허용 여부는 BE가 판정한다.
        const url = rawLink.trim();
        try {
            const parsed = new URL(url);
            if (!url.startsWith("https://") || parsed.username || parsed.password || url.length > 2048) {
                return "linkInvalid";
            }
        } catch {
            return "linkInvalid";
        }
        return { source: { kind, url }, files: new Map() };
    }

    // 파일 수와 누계를 먼저 검사해 서버 작업 없이 잘못된 업로드를 정정할 수 있게 한다.
    if (kind === "ZIP" && files.length !== 1) return "archiveCount";
    if (files.length < 1 || files.length > MAX_IMAGE_COUNT) return "fileCount";
    const perFileLimit = kind === "ZIP" ? MAX_SOURCE_BYTES : MAX_IMAGE_BYTES;
    if (files.some((file) => file.size < 1 || file.size > perFileLimit)
        || files.reduce((size, file) => size + file.size, 0) > MAX_SOURCE_BYTES) {
        return "fileSize";
    }

    // 파일명 순서와 실제 파일을 별개로 유지한다. ZIP 유형은 OS가 비표준 MIME을 주기도 한다.
    const uploads = new Map<string, File>();
    const descriptors: UploadFile[] = [];
    for (const [index, file] of files.entries()) {
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
        const contentType = kind === "ZIP" && extension === "zip" ? "application/zip" : IMAGE_TYPES[extension];
        if (!contentType || (kind === "ZIP" && contentType !== "application/zip") || file.name.length > 255) {
            return "fileType";
        }
        const clientFileId = String(index + 1);
        uploads.set(clientFileId, file);
        descriptors.push({ clientFileId, fileName: file.name, contentType, sizeBytes: file.size });
    }

    const source: JobSource = kind === "ZIP" ? { kind, archive: descriptors[0] } : { kind, files: descriptors };
    return { source, files: uploads };
}

/** 선택 위치를 목록 안에서 한 칸 이동하고 원본 배열은 보존한다. */
export function moveImagePage(ids: string[], pageId: string, offset: -1 | 1): string[] {
    const index = ids.indexOf(pageId);
    const destination = index + offset;
    if (index < 0 || destination < 0 || destination >= ids.length) return ids;

    const reordered = [...ids];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    return reordered;
}
