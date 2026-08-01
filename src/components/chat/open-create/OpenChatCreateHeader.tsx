"use client";

import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

interface OpenChatCreateHeaderProps {
    createdRoomId: number | null;
    isSubmitting: boolean;
    onBack: () => void;
}

export function OpenChatCreateHeader({
    createdRoomId,
    isSubmitting,
    onBack,
}: OpenChatCreateHeaderProps) {
    const t = useTranslations("OpenChatCreate");

    return (
        <>
            <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black text-slate-500 transition hover:bg-white hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/5"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {createdRoomId === null
                    ? t("actions.backToChat")
                    : t("actions.openCreatedRoom")}
            </button>

            <header className="mt-4 overflow-hidden rounded-[2rem] border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 shadow-sm dark:border-orange-400/20 dark:from-orange-500/10 dark:via-slate-950 dark:to-amber-500/10 sm:p-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white dark:bg-orange-400 dark:text-slate-950">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("header.badge")}
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    {t("header.title")}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                    {t("header.description")}
                </p>
            </header>

            {createdRoomId !== null && (
                <section
                    role="status"
                    aria-live="polite"
                    className="mt-6 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100"
                    data-testid="open-chat-create-partial-success"
                >
                    <div className="flex items-start gap-3">
                        <CheckCircle2
                            className="mt-0.5 h-5 w-5 shrink-0"
                            aria-hidden="true"
                        />
                        <div>
                            <p className="font-black">
                                {t("partialSuccess.title")}
                            </p>
                            <p className="mt-1 text-sm leading-6">
                                {t("partialSuccess.description")}
                            </p>
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}
