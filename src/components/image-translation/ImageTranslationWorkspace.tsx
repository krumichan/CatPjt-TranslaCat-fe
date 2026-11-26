"use client";

import { useLocale } from "next-intl";

import { canCancelImageJob } from "@/features/image-translation/model";
import { getImageTranslationMessages, type ImageTranslationMessages } from "@/features/image-translation/messages";
import { useImageJob } from "@/features/image-translation/useImageJob";
import { ImageTranslationRequestError } from "@/services/image-translation/imageTranslationService";

import { ImageTranslationAttribution } from "./ImageTranslationAttribution";
import { ImageTranslationInputs, panelStyle, quietButton } from "./ImageTranslationInputs";
import { ImageTranslationJobReader } from "./ImageTranslationJobReader";
import { ImageTranslationPageSelection } from "./ImageTranslationPageSelection";

// 서버의 내부 오류나 승인되지 않은 주소를 화면 문구로 그대로 복사하지 않는다.
function failureMessage(
    error: unknown,
    messages: ImageTranslationMessages,
    stage: "read" | "action" | "upload",
    hasSnapshot: boolean,
): string {
    if (error instanceof ImageTranslationRequestError) {
        if (error.status === 410 || error.code === "UPLOAD_EXPIRED") return messages.expired;
        if (stage === "upload") return messages.uploadFailed;
        if (error.status === 404) return messages.jobNotFound;
        if (error.status === 409) return messages.conflict;
        if (error.status === 422 && stage === "action") return messages.unsupportedLink;
        if (error.status === 429) return messages.rateLimit;
        if (error.status === 503 && stage === "action") return messages.unavailable;
    }

    if (stage === "upload") return messages.uploadFailed;
    if (stage !== "read") return messages.operationFailed;
    return hasSnapshot ? messages.retryReadFailed : messages.unavailable;
}

/** 인증 세션 단위로 업로드 작업과 열람 주소를 관리한다. */
export function ImageTranslationWorkspace({ initialJobId, sessionId }: { initialJobId?: string; sessionId?: string }) {
    const locale = useLocale();
    const messages = getImageTranslationMessages(locale);
    const state = useImageJob(initialJobId, sessionId);
    const { job, jobId, busy, readFailure, workFailure, uploadProgress } = state;
    const completed = job ? job.counts.ready + job.counts.noText : 0;
    const remaining = job ? job.counts.pending + job.counts.running : 0;
    const readerStates = ["QUEUED", "RUNNING", "SUCCEEDED", "PARTIAL_FAILED", "FAILED", "CANCELLED"];
    const hasReader = job && job.pages.length > 0 && readerStates.includes(job.status);
    const failure = workFailure ?? readFailure;

    return (
        <main className="mx-auto min-h-screen max-w-4xl space-y-5 px-4 pb-14 pt-24 text-slate-900 dark:text-slate-100 sm:px-6">
            <header>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{messages.title}</h1>
                {!jobId && <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.description}</p>}
            </header>

            {failure && (
                <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                    <p>{failureMessage(failure.error, messages, failure.type, Boolean(job))}</p>
                    {failure.type === "read" && <button type="button" className={quietButton} onClick={state.refreshJob}>{messages.retryRead}</button>}
                </div>
            )}

            {!jobId && <ImageTranslationInputs messages={messages} busy={busy} onSubmit={state.submit} />}

            {jobId && (
                <section className={panelStyle} aria-label={messages.title}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div data-testid="image-translation-counts" data-job-state={job?.status} role="status" aria-live="polite">
                            <h2 className="font-bold">{job ? messages.statuses[job.status] : messages.waiting}</h2>
                            {hasReader && (
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                    {messages.finish} {completed} / {job.pages.length} · {messages.waiting} {remaining} · {messages.pageStatuses.FAILED} {job.counts.failed}
                                </p>
                            )}
                            {job?.status === "AWAITING_UPLOAD" && uploadProgress && (
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    {messages.uploadStatus} {uploadProgress.done} / {uploadProgress.total}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {job && canCancelImageJob(job.status) && (
                                <button type="button" className={quietButton} disabled={busy} onClick={() => void state.act("cancel")}>{messages.cancel}</button>
                            )}
                            {job?.status === "AWAITING_UPLOAD" && !busy && (
                                <button type="button" className={quietButton} onClick={() => void state.act("prepare")}>{messages.prepare}</button>
                            )}
                            {(!job || !canCancelImageJob(job.status) || job.status === "AWAITING_UPLOAD") && (
                                <button type="button" className={quietButton} disabled={busy} onClick={state.resetJob}>{messages.newJob}</button>
                            )}
                        </div>
                    </div>
                    {job?.failure && <p role="alert" className="mt-3 text-sm text-amber-800 dark:text-amber-200">{messages.failures[job.failure.code] ?? messages.operationFailed}</p>}
                </section>
            )}

            {job && job.inputIssues.length > 0 && (
                <details className={panelStyle}>
                    <summary className="cursor-pointer font-semibold">{messages.excluded} {job.inputIssues.length}</summary>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                        {job.inputIssues.map((issue, index) => (
                            <li key={index} className="break-all">{issue.fileName} · {messages.failures[issue.code] ?? messages.operationFailed}</li>
                        ))}
                    </ul>
                </details>
            )}

            {job?.attribution && <ImageTranslationAttribution value={job.attribution} />}
            {job?.status === "READY" && (
                <ImageTranslationPageSelection
                    key={job.jobId}
                    job={job}
                    sessionId={sessionId}
                    messages={messages}
                    busy={busy}
                    onStart={(pageIds) => void state.act("start", { pageIds, revision: job.revision })}
                />
            )}
            {hasReader && (
                <ImageTranslationJobReader
                    key={job.jobId}
                    job={job}
                    sessionId={sessionId}
                    messages={messages}
                    busy={busy}
                    onRetry={(pageIds) => void state.act("retry", { pageIds, revision: job.revision })}
                />
            )}
        </main>
    );
}
