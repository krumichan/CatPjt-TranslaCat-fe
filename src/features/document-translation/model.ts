export const DOCUMENT_TRANSLATION_PATH = "/document-translation";
export const DOCUMENT_LANGUAGE_OPTIONS = ["ja", "ko", "en"] as const;
export const DOCUMENT_FORMATS = ["pptx", "docx", "xlsx"] as const;
export const DOCUMENT_MAX_FILE_BYTES = 10 * 1024 * 1024;

export type DocumentLanguage = (typeof DOCUMENT_LANGUAGE_OPTIONS)[number];
export type DocumentSourceLanguage = "auto" | DocumentLanguage;
export type DocumentFormat = (typeof DOCUMENT_FORMATS)[number];

export type DocumentJobStatus =
    | "QUEUED" | "VALIDATING" | "TRANSLATING" | "REPACKING" | "CANCELLING"
    | "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED";

export type DocumentWarningCode = "UNSUPPORTED_CONTENT" | "LAYOUT_REVIEW" | "FORMULA_RESULT_MAY_CHANGE";

export type DocumentJob = {
    jobId: string;
    status: DocumentJobStatus;
    format: DocumentFormat;
    fileName: string;
    sourceLanguage: DocumentSourceLanguage;
    targetLanguage: DocumentLanguage;
    completedSegments: number;
    totalSegments: number | null;
    warnings: { code: DocumentWarningCode; count: number; locations: string[] }[];
    errorCode: string | null;
    retryable: boolean;
    downloadPath: string | null;
    outputSizeBytes?: number | null;
    createdAt: string;
    expiresAt: string;
};

export type DocumentUpload = {
    file: File;
    sourceLanguage: DocumentSourceLanguage;
    targetLanguage: DocumentLanguage;
};

const JOB_ID_PATTERN = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;

/** API와 작업 URL에서 사용하는 표준 UUID 문자열을 확인한다. */
export function isDocumentJobId(value: string): boolean {
    return JOB_ID_PATTERN.test(value);
}

/** 받아들인 작업 ID를 locale이 없는 App Router 경로로 만든다. */
export function documentJobPath(jobId: string): string {
    return DOCUMENT_TRANSLATION_PATH + "/jobs/" + jobId;
}

/** 상태가 바뀔 수 있는 작업만 주기적으로 조회한다. */
export function isActiveDocumentJob(status: DocumentJobStatus): boolean {
    return status === "QUEUED" || status === "VALIDATING" || status === "TRANSLATING"
        || status === "REPACKING" || status === "CANCELLING";
}

/** 로컬에서 판정할 수 있는 파일 크기와 확장자 오류를 반환한다. */
export function documentUploadError(file: File): string | undefined {
    if (file.size === 0) {
        return "EMPTY_FILE";
    }
    if (file.size > DOCUMENT_MAX_FILE_BYTES) {
        return "FILE_TOO_LARGE";
    }

    // MIME은 브라우저에서 비어 있을 수 있으므로 실제 형식 검사는 BE에서 시행한다.
    const suffix = file.name.match(/\.([^.]+)$/)?.[1]?.toLowerCase();
    return DOCUMENT_FORMATS.some((format) => format === suffix) ? undefined : "UNSUPPORTED_FORMAT";
}

/** 교차 원점 헤더에 의존하지 않고 번역 언어와 원래 확장자를 반영한다. */
export function documentResultFileName(job: Pick<DocumentJob, "fileName" | "targetLanguage" | "format">): string {
    const cleanName = job.fileName.replace(/[/\\\u0000-\u001f\u007f]/g, "_");
    const basename = cleanName.replace(/\.[^.]+$/, "").trim() || "translation";
    return [basename, job.targetLanguage, job.format].join(".");
}
