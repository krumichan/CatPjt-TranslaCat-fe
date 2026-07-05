"use client";

import { MessageCircle, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

interface ChatRoomEmptyStateProps {
    onStartChatClick: () => void;
}

export function ChatRoomEmptyState({
    onStartChatClick,
}: ChatRoomEmptyStateProps) {
    const t = useTranslations("ChatRoomList.empty");

    return (
        <section className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="max-w-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                    <MessageCircle className="h-7 w-7" />
                </div>

                <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {t("title")}
                </h2>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {t("description")}
                </p>

                <button
                    type="button"
                    onClick={onStartChatClick}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" />
                    {t("startChatButton")}
                </button>
            </div>
        </section>
    );
}
