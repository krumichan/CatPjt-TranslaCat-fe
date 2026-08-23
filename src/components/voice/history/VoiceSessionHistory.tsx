"use client";

import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ChangeEvent } from "react";

import { VoiceReadingText } from "@/components/voice/common/VoiceReadingText";
import type { VoiceHistoryController } from "@/hooks/voice/useVoiceHistory";
import type { VoiceSegmentResponse, VoiceSessionResponse } from "@/types/voice";

interface VoiceSessionHistoryProps {
    controller: VoiceHistoryController;
}

function formatDate(value: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function HistorySegment({
    sessionId,
    segment,
    controller,
}: {
    sessionId: string;
    segment: VoiceSegmentResponse;
    controller: VoiceHistoryController;
}) {
    const t = useTranslations("Voice");
    const canRetry =
        Boolean(segment.sourceText?.trim()) &&
        (segment.translatedText === null || segment.errorCode !== null);

    return (
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                <span>{t(`channel.${segment.channel}`)}</span>
                <span>#{segment.utteranceSequence}</span>
            </div>
            <VoiceReadingText
                text={segment.sourceText}
                tokens={segment.sourceReadingTokens}
                className="text-sm font-medium"
            />
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {segment.translatedText ?? t("history.translationUnavailable")}
            </p>
            {segment.errorCode && (
                <p className="mt-1 text-xs text-red-500">{segment.errorCode}</p>
            )}
            {canRetry && (
                <div className="mt-3 flex justify-end">
                    <button
                        type="button"
                        onClick={() =>
                            void controller.retryTranslation(sessionId, segment.id)
                        }
                        disabled={controller.actionSessionId === sessionId}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold dark:border-zinc-700"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {t("history.retryTranslation")}
                    </button>
                </div>
            )}
        </div>
    );
}

function HistoryItem({
    item,
    controller,
}: {
    item: VoiceSessionResponse;
    controller: VoiceHistoryController;
}) {
    const t = useTranslations("Voice");
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(item.title ?? "");
    const selected = controller.selectedSessionId === item.id;
    const busy = controller.actionSessionId === item.id;

    const saveTitle = async () => {
        const saved = await controller.renameSession(item.id, title);
        if (saved) setEditing(false);
    };

    const remove = async () => {
        if (!window.confirm(t("history.deleteConfirm"))) return;
        await controller.deleteSession(item.id);
    };

    return (
        <article className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => void controller.toggleSession(item.id)}
                >
                    <div className="truncate font-semibold">
                        {item.title || t("history.untitled")}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                        {t(`mode.${item.mode}.title`)} · {formatDate(item.completedAt ?? item.createdAt)}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                        {t("history.processedAudio", {
                            seconds: Math.round(item.processedAudioMs / 1000),
                        })}
                    </div>
                </button>
                <div className="flex gap-1">
                    <button
                        type="button"
                        aria-label={t("history.rename")}
                        onClick={() => setEditing((current) => !current)}
                        disabled={busy}
                        className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        aria-label={t("history.delete")}
                        onClick={() => void remove()}
                        disabled={busy}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {editing && (
                <div className="mt-4 flex gap-2">
                    <input
                        value={title}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
                        maxLength={100}
                        className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                        placeholder={t("history.titlePlaceholder")}
                    />
                    <button
                        type="button"
                        onClick={() => void saveTitle()}
                        disabled={busy}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                        {t("history.saveTitle")}
                    </button>
                </div>
            )}

            {selected && (
                <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-900">
                    {controller.loadingSessionId === item.id ? (
                        <p className="text-sm text-zinc-500">{t("history.loadingSegments")}</p>
                    ) : controller.selectedSegments.length > 0 ? (
                        <div className="space-y-2">
                            {controller.selectedSegments.map((segment) => (
                                <HistorySegment
                                    key={segment.id}
                                    sessionId={item.id}
                                    segment={segment}
                                    controller={controller}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500">{t("history.emptySegments")}</p>
                    )}
                </div>
            )}
        </article>
    );
}

export function VoiceSessionHistory({ controller }: VoiceSessionHistoryProps) {
    const t = useTranslations("Voice");

    return (
        <section className="rounded-3xl border border-zinc-200 bg-zinc-50/60 p-6 dark:border-zinc-800 dark:bg-zinc-900/20">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold">{t("history.title")}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{t("history.description")}</p>
                </div>
                <button
                    type="button"
                    onClick={() => void controller.reload()}
                    className="rounded-xl border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
                >
                    {t("history.refresh")}
                </button>
            </div>

            {controller.isLoading ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                    {t("history.loading")}
                </p>
            ) : controller.loadError ? (
                <p className="py-8 text-center text-sm text-red-500">
                    {t("history.loadFailed")}
                </p>
            ) : controller.items.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                    {t("history.empty")}
                </p>
            ) : (
                <div className="space-y-3">
                    {controller.items.map((item) => (
                        <HistoryItem key={item.id} item={item} controller={controller} />
                    ))}
                </div>
            )}

            {controller.actionError && (
                <p className="mt-4 text-sm text-red-500">{t("history.actionFailed")}</p>
            )}

            {controller.hasMore && (
                <div className="mt-5 flex justify-center">
                    <button
                        type="button"
                        onClick={() => void controller.loadMore()}
                        className="rounded-xl border border-zinc-300 px-5 py-2 text-sm font-semibold dark:border-zinc-700"
                    >
                        {t("history.loadMore")}
                    </button>
                </div>
            )}
        </section>
    );
}
