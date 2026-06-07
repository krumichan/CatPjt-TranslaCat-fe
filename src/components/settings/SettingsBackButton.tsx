"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";

type SettingsBackButtonProps = {
    fallbackHref?: string;
    variant?: "default" | "ghost" | "icon";
};

export default function SettingsBackButton({
   fallbackHref = "/settings",
   variant = "default",
}: SettingsBackButtonProps) {
    const t = useTranslations("Settings.common");
    const router = useRouter();

    const handleBack = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
            return;
        }

        router.push(fallbackHref);
    };

    if (variant === "icon") {
        return (
            <button
                type="button"
                onClick={handleBack}
                aria-label={t("back")}
                title={t("back")}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-orange-500 transition hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
            >
                <ArrowLeft className="h-4 w-4" />
            </button>
        );
    }

    const className =
        variant === "ghost"
            ? "inline-flex w-fit items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-orange-50 hover:text-orange-500 dark:text-slate-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
            : "inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-orange-400/60 dark:hover:bg-orange-500/10 dark:hover:text-orange-300";

    return (
        <button type="button" onClick={handleBack} className={className}>
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
        </button>
    );
}