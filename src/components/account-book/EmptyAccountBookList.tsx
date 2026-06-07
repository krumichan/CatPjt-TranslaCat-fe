import { useTranslations } from "next-intl";

export default function EmptyAccountBookList() {
    const t = useTranslations("AccountBook.empty");

    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center shadow-sm dark:border-white/10 dark:bg-slate-950/50">
            <p className="text-lg font-black text-slate-700 dark:text-white">
                {t("title")}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t("description")}
            </p>
        </div>
    );
}