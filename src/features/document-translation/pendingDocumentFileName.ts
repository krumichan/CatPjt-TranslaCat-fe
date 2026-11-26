const NAME_HANDOFF_MS = 30_000;

type PendingDocumentFileName = {
    jobId: string;
    loginSessionId: string;
    fileName: string;
    expiresAt: number;
    timer: number;
};

let pendingFileName: PendingDocumentFileName | undefined;

// 사용자 세션의 화면 이동에 쓰인 한 건만 남기고 기존 타이머를 해제한다.
function clearPendingName() {
    if (pendingFileName) {
        window.clearTimeout(pendingFileName.timer);
        pendingFileName = undefined;
    }
}

/** 접수 화면에서 작업 화면으로 넘길 파일명을 30초 동안 브라우저 메모리에 둔다. */
export function rememberDocumentFileName(jobId: string, loginSessionId: string, fileName: string) {
    clearPendingName();
    const record: PendingDocumentFileName = {
        jobId,
        loginSessionId,
        fileName,
        expiresAt: Date.now() + NAME_HANDOFF_MS,
        timer: window.setTimeout(() => {
            if (pendingFileName === record) {
                pendingFileName = undefined;
            }
        }, NAME_HANDOFF_MS),
    };
    pendingFileName = record;
}

/** 같은 작업과 로그인 세션의 작업 화면만 원본 파일명을 한 번 가져간다. */
export function takeDocumentFileName(jobId: string, loginSessionId: string): string | undefined {
    const record = pendingFileName;
    if (!record || record.jobId !== jobId || record.loginSessionId !== loginSessionId) {
        return undefined;
    }

    clearPendingName();
    return Date.now() < record.expiresAt ? record.fileName : undefined;
}
