import { useLocale, useTranslations } from "next-intl";
import { useAmountFormatter } from "@/components/account-book/AccountBookCurrencyProvider";
import { inclusiveAnalysisEnd } from "@/utils/account-book/spendingAnalysis";
import type { SpendingAnalysisHistoryPage } from "@/types/accountBookAnalysis";

type Props = { history?: SpendingAnalysisHistoryPage; page: number; loading: boolean; error: boolean; busy: boolean;
    onPage: (page: number) => void; onOpen: (id: string) => void; onRetry: () => void };

export default function SpendingAnalysisHistory({ history, page, loading, error, busy, onPage, onOpen, onRetry }: Props) {
    const t = useTranslations("AccountBook.detail.spendingAnalysis");
    const locale = useLocale();
    const formatAmount = useAmountFormatter();
    const date = (value: string) => new Intl.DateTimeFormat(locale === "learning" ? "ja" : locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    return <section className="mt-6 min-w-0 border-t border-slate-200 pt-5 dark:border-white/10" data-testid="spending-analysis-history">
        <h3 className="font-semibold text-slate-900 dark:text-white">{t("historyTitle", { count: history?.total ?? 0 })}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("historyNotice")}</p>
        {loading && <p role="status" className="mt-3 text-sm text-slate-500">{t("historyLoading")}</p>}
        {error && <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-300"><p>{t("historyFailed")}</p><button type="button" onClick={onRetry} className="rounded-lg border px-3 py-2">{t("retrySnapshot")}</button></div>}
        {!loading && !error && history?.items.length === 0 && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("historyEmpty")}</p>}
        <ul className="mt-3 space-y-2">
            {history?.items.map(item => <li key={item.analysisId}>
                <button type="button" disabled={busy} onClick={() => item.analysisId && onOpen(item.analysisId)} className="w-full min-w-0 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5">
                    <span className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><span>{item.periodStart} ~ {inclusiveAnalysisEnd(item.periodEndExclusive)}</span><span className="text-xs font-normal text-slate-500 dark:text-slate-400">{date(item.generatedAt)}</span></span>
                    <span className="mt-1 block line-clamp-2 break-words text-sm text-slate-600 dark:text-slate-300">{item.summary}</span>
                    <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400"><span>{t(item.contextComment ? "contextApplied" : "amountOnly")}</span>{item.savings && <span>{t("historySavings", { amount: formatAmount(item.savings.estimate, item.currencyCode) })}</span>}</span>
                </button>
            </li>)}
        </ul>
        {history && history.total > history.size && <div className="mt-3 flex items-center justify-between gap-2 text-sm">
            <button type="button" disabled={page === 0 || loading} onClick={() => onPage(page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">{t("historyPrevious")}</button>
            <span className="text-slate-500">{page + 1} / {Math.ceil(history.total / history.size)}</span>
            <button type="button" disabled={(page + 1) * history.size >= history.total || loading} onClick={() => onPage(page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">{t("historyNext")}</button>
        </div>}
    </section>;
}
