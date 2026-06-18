import { Save } from "lucide-react";
import { useTranslations } from "next-intl";

import { ReceiptOcrSetting } from "@/types/receiptSetting";

type ReceiptOcrSettingsSectionProps = {
    settings: ReceiptOcrSetting[];
    isLoading: boolean;
    isError: unknown;
    savingId: number | null;
    onChange: (
        setting: ReceiptOcrSetting,
        nextValue: Partial<ReceiptOcrSetting>,
    ) => void;
};

const languageOptions = [
    { value: "japan", labelKey: "languages.japan" },
    { value: "korean", labelKey: "languages.korean" },
    { value: "en", labelKey: "languages.en" },
];

export default function ReceiptOcrSettingsSection({
    settings,
    isLoading,
    isError,
    savingId,
    onChange,
}: ReceiptOcrSettingsSectionProps) {
    const t = useTranslations("Settings.receiptAiPage.ocr");

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {t("title")}
                    </h2>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {t("description")}
                    </p>
                </div>
            </div>

            {isLoading ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:bg-black/25 dark:text-slate-400">
                    {t("messages.loading")}
                </p>
            ) : isError ? (
                <p className="rounded-2xl bg-red-50 px-4 py-5 text-sm text-red-500 dark:bg-red-500/10 dark:text-red-300">
                    {t("messages.loadFailed")}
                </p>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                    <div className="grid grid-cols-[1fr_1.3fr_0.8fr_0.8fr] bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400 dark:bg-black/25">
                        <span>{t("columns.currency")}</span>
                        <span>{t("columns.language")}</span>
                        <span>{t("columns.enabled")}</span>
                        <span>{t("columns.status")}</span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-white/10">
                        {settings.map((setting) => (
                            <div
                                key={setting.id}
                                className="grid grid-cols-[1fr_1.3fr_0.8fr_0.8fr] items-center gap-3 px-4 py-3"
                            >
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {setting.currencyCode}
                                </p>

                                <select
                                    value={setting.ocrLanguage}
                                    disabled={savingId !== null}
                                    onChange={(event) =>
                                        onChange(setting, {
                                            ocrLanguage: event.target.value,
                                        })
                                    }
                                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:ring-orange-500/20"
                                >
                                    {languageOptions.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {t(option.labelKey)}
                                        </option>
                                    ))}
                                </select>

                                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={setting.enabled}
                                        disabled={savingId !== null}
                                        onChange={(event) =>
                                            onChange(setting, {
                                                enabled: event.target.checked,
                                            })
                                        }
                                        className="h-4 w-4 accent-orange-500"
                                    />
                                    {setting.enabled
                                        ? t("enabled")
                                        : t("disabled")}
                                </label>

                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    {savingId === setting.id ? (
                                        <>
                                            <Save
                                                size={14}
                                                className="animate-pulse text-orange-500"
                                            />
                                            {t("saving")}
                                        </>
                                    ) : (
                                        t("saved")
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}