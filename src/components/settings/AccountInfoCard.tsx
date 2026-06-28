"use client";

import { Check, Copy, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Link } from "@/navigation";

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
    const profileT = useTranslations("Social.profileEntry");
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
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-200">
                        <UserRound className="h-7 w-7" aria-hidden="true" />
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
                            {t("eyebrow")}
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                            {name || t("unknownName")}
                        </h2>

                        {email && (
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                                {email}
                            </p>
                        )}

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-300">
                            {t("description")}
                        </p>
                    </div>
                </div>

                <Link
                    href="/settings/profile"
                    className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300"
                >
                    {profileT("manage")}
                </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    {t("publicIdLabel")}
                </p>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <code className="min-w-0 flex-1 truncate rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10">
                        {publicId || t("emptyPublicId")}
                    </code>

                    <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!publicId}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition hover:border-orange-300 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
                    >
                        {copied ? (
                            <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <Copy className="h-4 w-4" aria-hidden="true" />
                        )}
                        {copied ? t("copied") : t("copy")}
                    </button>
                </div>
            </div>
        </section>
    );
}
