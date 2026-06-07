import { useTranslations } from "next-intl";
import SettingsBackButton from "@/components/settings/SettingsBackButton";

export default function CurrencySettingsHeader() {
    const t = useTranslations("Settings.currencyPage");

    return (
        <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-orange-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/30 sm:p-8">
            <div className="mb-2 flex items-center gap-2">
                <SettingsBackButton fallbackHref="/settings" variant="icon" />

                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                    {t("eyebrow")}
                </p>
            </div>

            <h1 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
                {t("title")}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-300">
                {t("description")}
            </p>
        </section>
    );
}