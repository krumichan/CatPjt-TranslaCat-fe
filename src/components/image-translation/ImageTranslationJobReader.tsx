"use client";

import { useState } from "react";

import type { ImageJob } from "@/features/image-translation/model";
import type { ImageTranslationMessages } from "@/features/image-translation/messages";

import { ImageReaderPage } from "./ImageReaderPage";
import { panelStyle, quietButton } from "./ImageTranslationInputs";

type JobProps = {
    job: ImageJob;
    sessionId?: string;
    messages: ImageTranslationMessages;
    busy: boolean;
};

/** 페이지를 고정 순서로 읽고 선택한 실패 항목의 재시도만 요청한다. */
export function ImageTranslationJobReader({ job, messages, sessionId, busy, onRetry }: JobProps & { onRetry: (ids: string[]) => void }) {
    const [overlay, setOverlay] = useState(true);
    const [skippedRetries, setSkippedRetries] = useState<ReadonlySet<string>>(() => new Set());
    const retryable = job.status === "FAILED" || job.status === "PARTIAL_FAILED"
        ? job.pages.filter((page) => page.state === "FAILED" && page.failure?.retryable)
        : [];
    const retryIds = retryable.map((page) => page.pageId).filter((id) => !skippedRetries.has(id));

    // 재시도 대상에서 제외할지 선택하고 새 조회가 올 때도 나머지 선택을 유지한다.
    function toggleRetry(pageId: string, included: boolean) {
        const next = new Set(skippedRetries);
        if (included) next.delete(pageId);
        else next.add(pageId);
        setSkippedRetries(next);
    }

    return (
        <section aria-label={messages.title} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <label className="flex min-h-10 items-center gap-2 font-semibold">
                    <input type="checkbox" checked={overlay} onChange={(event) => setOverlay(event.target.checked)} />
                    {messages.showTranslation}
                </label>
            </div>

            {retryable.length > 0 && (
                <fieldset className={panelStyle}>
                    <legend className="px-1 text-base font-semibold">{messages.retry}</legend>
                    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2">
                        {retryable.map((page) => (
                            <label key={page.pageId} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={!skippedRetries.has(page.pageId)}
                                    disabled={busy}
                                    onChange={(event) => toggleRetry(page.pageId, event.target.checked)}
                                />
                                {messages.page} {page.order + 1}
                            </label>
                        ))}
                    </div>
                    <button
                        type="button"
                        data-testid="image-translation-retry"
                        className={quietButton}
                        disabled={busy || retryIds.length === 0}
                        onClick={() => onRetry(retryIds)}
                    >
                        {messages.retry}
                    </button>
                </fieldset>
            )}

            {job.pages.map((page) => (
                <ImageReaderPage
                    key={page.pageId}
                    jobId={job.jobId}
                    page={page}
                    messages={messages}
                    sessionId={sessionId}
                    overlay={overlay}
                />
            ))}
        </section>
    );
}
