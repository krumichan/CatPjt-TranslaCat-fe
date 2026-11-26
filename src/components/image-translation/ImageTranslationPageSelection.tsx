"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";

import { moveImagePage, type ImageJob } from "@/features/image-translation/model";
import type { ImageTranslationMessages } from "@/features/image-translation/messages";

import { ImagePageThumbnail } from "./ImagePageThumbnail";
import { actionButton, panelStyle, quietButton } from "./ImageTranslationInputs";

type JobProps = {
    job: ImageJob;
    sessionId?: string;
    messages: ImageTranslationMessages;
    busy: boolean;
};

/** 미리보기의 순서와 포함 여부를 실행 요청으로 넘긴다. */
export function ImageTranslationPageSelection({ job, sessionId, messages, busy, onStart }: JobProps & { onStart: (ids: string[]) => void }) {
    const [order, setOrder] = useState(() => job.pages.map((page) => page.pageId));
    const [excluded, setExcluded] = useState<ReadonlySet<string>>(() => new Set());
    const pageById = new Map(job.pages.map((page) => [page.pageId, page]));
    const selected = order.filter((id) => pageById.has(id) && !excluded.has(id));

    // 체크박스는 목록 순서를 바꾸지 않고 제출 대상만 변경한다.
    function toggle(id: string, included: boolean) {
        const next = new Set(excluded);
        if (included) next.delete(id);
        else next.add(id);
        setExcluded(next);
    }

    return (
        <section aria-label={messages.pageSelection} className={panelStyle}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold">{messages.pageSelection}</h2>
                    <p aria-live="polite" className="text-sm text-slate-600 dark:text-slate-300">{messages.included} {selected.length} / {job.pages.length}</p>
                </div>
                <button
                    type="button"
                    data-testid="image-translation-start"
                    className={actionButton}
                    disabled={busy || selected.length === 0}
                    onClick={() => onStart(selected)}
                >
                    {messages.start}
                </button>
            </div>

            <ol className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
                {order.map((id, index) => {
                    const page = pageById.get(id);
                    if (!page) return null;
                    const label = messages.page + " " + (index + 1);

                    return (
                        <li key={id} className="flex flex-wrap items-center gap-3 py-3">
                            <ImagePageThumbnail jobId={job.jobId} page={page} sessionId={sessionId} messages={messages} />
                            <label className="flex min-w-30 flex-1 items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={!excluded.has(id)}
                                    disabled={busy}
                                    onChange={(event) => toggle(id, event.target.checked)}
                                    aria-label={messages.selectPage + " " + label}
                                />
                                <span className="min-w-0 break-all text-sm font-medium">{index + 1}. {page.fileName ?? label}</span>
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    aria-label={messages.moveUp + " " + label}
                                    className={quietButton}
                                    disabled={busy || index === 0}
                                    onClick={() => setOrder((value) => moveImagePage(value, id, -1))}
                                >
                                    <ArrowUp className="size-4" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={messages.moveDown + " " + label}
                                    className={quietButton}
                                    disabled={busy || index === order.length - 1}
                                    onClick={() => setOrder((value) => moveImagePage(value, id, 1))}
                                >
                                    <ArrowDown className="size-4" aria-hidden="true" />
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
