import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { SettingCard } from "@/components/settings/settingCards";

type SettingsCardProps = {
    card: SettingCard;
};

export default function SettingsCard({ card }: SettingsCardProps) {
    const t = useTranslations("Settings");

    const Icon = card.icon;
    const isEnabled = card.enabled ?? false;

    const content = (
        <article
            className={`group flex h-full items-stretch justify-between rounded-3xl border p-5 shadow-lg backdrop-blur transition ${
                isEnabled
                    ? "border-white/70 bg-white/85 shadow-orange-100/50 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50/80 dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/30 dark:hover:border-orange-400/60 dark:hover:bg-orange-500/10"
                    : "border-slate-200 bg-slate-100/80 opacity-75 dark:border-white/10 dark:bg-slate-900/50"
            }`}
        >
            <div className="flex min-w-0 gap-4">
                <span
                    className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                        isEnabled
                            ? "bg-orange-100 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300"
                            : "bg-slate-200 text-slate-400 dark:bg-white/5 dark:text-slate-500"
                    }`}
                >
                    <Icon className="h-6 w-6" />
                </span>

                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">
                            {t(card.titleKey)}
                        </h2>

                        {card.adminOnly && (
                            <span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-500 dark:bg-rose-500/10 dark:text-rose-300">
                                {t("badges.admin")}
                            </span>
                        )}

                        <span
                            className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                                isEnabled
                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                                    : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                            }`}
                        >
                            {t(card.statusKey)}
                        </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {t(card.descriptionKey)}
                    </p>
                </div>
            </div>

            <ChevronRight
                className={`mt-1 h-5 w-5 shrink-0 transition ${
                    isEnabled
                        ? "text-slate-300 group-hover:text-orange-400"
                        : "text-slate-300 dark:text-slate-700"
                }`}
            />
        </article>
    );

    if (!isEnabled) {
        return <div>{content}</div>;
    }

    return <Link href={card.href}>{content}</Link>;
}