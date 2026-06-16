"use client";

import { Check, Copy, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type AccountInfoCardProps = {
    name?: string | null;
    email?: string | null;
    publicId?: string | null;
};

export default function AccountInfoCard({
    name,
    email,
    publicId,
}: AccountInfoCardProps) {
    const t = useTranslations("Settings.accountInfo");
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!publicId) {
            return;
        }

        await navigator.clipboard.writeText(publicId);
        setCopied(true);

        window.setTimeout(() => {
            setCopied(false);
        }, 1500);
    };

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                        <UserRound size={24} />
                    </div>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-500">
                            {t("eyebrow")}
                        </p>

                        <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                            {name || t("unknownName")}
                        </h2>

                        {email && (
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {email}
                            </p>
                        )}

                        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            {t("description")}
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/25 md:min-w-[320px]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {t("publicIdLabel")}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 dark:bg-zinc-900 dark:text-slate-100">
                            {publicId || t("emptyPublicId")}
                        </code>

                        <button
                            type="button"
                            onClick={handleCopy}
                            disabled={!publicId}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                            aria-label={t("copy")}
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>

                    {copied && (
                        <p className="mt-2 text-xs font-semibold text-orange-600 dark:text-orange-300">
                            {t("copied")}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}