"use client";

import { ArrowDownToLine, RotateCcw, X } from "lucide-react";

import { Link } from "@/navigation";

import { documentErrorMessage, type DocumentTranslationCopy } from "./messages";
import { DOCUMENT_TRANSLATION_PATH, isActiveDocumentJob } from "./model";
import { DOCUMENT_PANEL, DOCUMENT_SECONDARY_BUTTON } from "./styles";
import { useDocumentJob } from "./useDocumentJob";

type Props = { jobId: string; loginSessionId: string; copy: DocumentTranslationCopy; locale: string };

/** 서버 상태와 저장 기한에 맞는 동작만 표시한다. */
export function DocumentJobPanel({ jobId, loginSessionId, copy, locale }: Props) {
    const {
        job, statusError, actionError, action, now, receivedResult, downloadRequested, canSaveFallback,
        refresh, execute, saveFallback, waitBeforeAction,
    } = useDocumentJob(jobId, loginSessionId);
    if (!job) {
        return (
            <div className={DOCUMENT_PANEL + " space-y-4"}>
                <p role={statusError ? "alert" : "status"}>
                    {statusError ? documentErrorMessage(copy, statusError) : copy.loading}
                </p>
                {statusError && (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className={DOCUMENT_SECONDARY_BUTTON} onClick={refresh}>{copy.readAgain}</button>
                        <Link href={DOCUMENT_TRANSLATION_PATH} className={DOCUMENT_SECONDARY_BUTTON}>{copy.newDocument}</Link>
                    </div>
                )}
            </div>
        );
    }

    // 서버가 결과를 건네준 작업은 수령 기한이 지나도 완료 상태로 표시한다.
    const expires = Date.parse(job.expiresAt);
    const redeemed = job.status === "SUCCEEDED" && (!job.downloadPath || receivedResult);
    const expired = job.status === "EXPIRED" || (!redeemed && now >= expires);
    const active = !expired && isActiveDocumentJob(job.status);
    const canCancel = active && job.status !== "CANCELLING";
    const canRetry = !expired && job.retryable && (job.status === "CANCELLED" || job.status === "FAILED");
    const unavailable = redeemed && !action && !downloadRequested && !canSaveFallback && !actionError;
    const showLongWait = active && now - Date.parse(job.createdAt) >= 60_000;
    const hasProgress = job.status === "TRANSLATING" && job.totalSegments !== null && job.totalSegments > 0;
    const actionDisabled = action !== undefined || waitBeforeAction;
    const displayLocale = locale === "learning" ? "ja" : locale;
    const expiryLabel = !redeemed && Number.isFinite(expires)
        ? new Intl.DateTimeFormat(displayLocale, { dateStyle: "medium", timeStyle: "short" }).format(expires)
        : null;

    return (
        <div className="space-y-4">
            <section className={DOCUMENT_PANEL + " space-y-5"} aria-label={copy.stage}>
                <div className="min-w-0">
                    <h2 className="break-all text-xl font-bold text-slate-900 dark:text-slate-100">{job.fileName}</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {job.format.toUpperCase()}{" · "}{copy.targetLanguage}{" · "}{copy.languages[job.targetLanguage]}
                    </p>
                </div>

                <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/65">
                    <p role="status" className="font-semibold text-slate-900 dark:text-slate-100">
                        {copy.states[expired ? "EXPIRED" : job.status]}
                    </p>
                    {hasProgress && (
                        <label className="grid gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <span>{copy.segmentProgress}{" · "}{job.completedSegments}{" / "}{job.totalSegments}</span>
                            <progress
                                className="h-2 w-full accent-blue-700"
                                value={job.completedSegments}
                                max={job.totalSegments ?? undefined}
                            />
                        </label>
                    )}
                    {showLongWait && <p className="text-sm text-slate-600 dark:text-slate-300">{copy.longerWait}</p>}
                    {job.errorCode && !expired && (
                        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                            {documentErrorMessage(copy, job.errorCode)}
                        </p>
                    )}
                </div>

                {expiryLabel && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        {copy.expires}{" · "}<time dateTime={job.expiresAt}>{expiryLabel}</time>
                    </p>
                )}
                {job.warnings.length > 0 && (
                    <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                        <h3 className="font-bold">{copy.warningsTitle}</h3>
                        <ul className="space-y-2">
                            {job.warnings.map((warning) => (
                                <li key={warning.code} className="break-words">
                                    {copy.warnings[warning.code]}{" ("}{warning.count}{")"}
                                    {warning.locations.length > 0 && (
                                        <p className="mt-1 text-xs">{warning.locations.join(" · ")}</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {statusError && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p role="alert" className="text-sm text-red-700 dark:text-red-300">{documentErrorMessage(copy, statusError)}</p>
                        <button type="button" className={DOCUMENT_SECONDARY_BUTTON} onClick={refresh}>{copy.readAgain}</button>
                    </div>
                )}
                {actionError && (
                    <p role="alert" className="text-sm text-red-700 dark:text-red-300">{documentErrorMessage(copy, actionError)}</p>
                )}
                {unavailable && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        {documentErrorMessage(copy, "DOWNLOAD_UNAVAILABLE")}
                    </p>
                )}
                {action === "download" && <p role="status" className="text-sm">{copy.downloading}</p>}
                {waitBeforeAction && <p role="status" className="text-sm">{copy.retryLater}</p>}
                {downloadRequested && (
                    <p role="status" className="text-sm text-emerald-800 dark:text-emerald-300">{copy.downloadStarted}</p>
                )}

                <div className="flex flex-wrap gap-2">
                    {canSaveFallback && (
                        <button type="button" className={DOCUMENT_SECONDARY_BUTTON} disabled={actionDisabled}
                                onClick={() => void saveFallback()}>
                            <ArrowDownToLine className="size-4" aria-hidden="true" />
                            {copy.saveIfBlocked}
                        </button>
                    )}
                    {canRetry && (
                        <button type="button" className={DOCUMENT_PRIMARY_BUTTON} disabled={actionDisabled} onClick={() => void execute("retry")}>
                            <RotateCcw className="size-4" aria-hidden="true" />
                            {action === "retry" ? copy.retrying : copy.retry}
                        </button>
                    )}
                    {canCancel && (
                        <button type="button" className={DOCUMENT_SECONDARY_BUTTON} disabled={actionDisabled} onClick={() => void execute("cancel")}>
                            <X className="size-4" aria-hidden="true" />
                            {action === "cancel" ? copy.cancelling : copy.cancel}
                        </button>
                    )}
                    {!active && <Link className={DOCUMENT_SECONDARY_BUTTON} href={DOCUMENT_TRANSLATION_PATH}>{copy.newDocument}</Link>}
                </div>
            </section>
        </div>
    );
}
