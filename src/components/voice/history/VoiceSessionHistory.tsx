"use client";

import { VoiceHistoryItem } from "@/components/voice/history/VoiceHistoryItem";
import type { VoiceHistoryController } from "@/hooks/voice/useVoiceHistory";
import { useTranslations } from "next-intl";

interface VoiceSessionHistoryProps {
    controller: VoiceHistoryController;
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
                        <VoiceHistoryItem key={item.id} item={item} controller={controller} />
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
