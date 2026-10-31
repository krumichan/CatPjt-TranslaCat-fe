import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { analysisLocale } from "@/utils/account-book/spendingAnalysis";
import TransactionList from "@/components/account-book/detail/transaction-list/TransactionList";
import type { TransactionViewMode } from "@/components/account-book/detail/transaction-list/TransactionViewToggle";
import TransactionDetailModal from "@/components/account-book/detail/modal/TransactionDetailModal";
import ExpenseRankingTransactionListDialog from "@/components/account-book/detail/ranking-chart/ExpenseRankingTransactionListDialog";
import type { AccountBookTransaction, CurrencyCode } from "@/types/accountBook";
import type { SpendingAnalysisFinding } from "@/types/accountBookAnalysis";

type Props = { finding: SpendingAnalysisFinding; currencyCode: CurrencyCode; generatedAt: string; onClose: () => void };

export default function SpendingAnalysisEvidenceModal({ finding, currencyCode, generatedAt, onClose }: Props) {
    const t = useTranslations("AccountBook.detail.spendingAnalysis");
    const locale = analysisLocale(useLocale());
    const [detail, setDetail] = useState<AccountBookTransaction | null>(null);
    const [viewMode, setViewMode] = useState<TransactionViewMode>("CARD");
    const closeDetail = useCallback(() => setDetail(null), [setDetail]);
    const generatedDate = new Date(generatedAt);
    const formattedDate = Number.isFinite(generatedDate.getTime())
        ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(generatedDate)
        : generatedAt;

    // 분석 당시의 검증된 거래 스냅샷만 재사용하며 편집·삭제 핸들러를 전달하지 않는다.
    if (detail) return <TransactionDetailModal transaction={detail} currencyCode={currencyCode} onClose={closeDetail} />;

    return (
        <ExpenseRankingTransactionListDialog title={t("evidenceTitle", { title: finding.title })}
            summary={t("evidenceSnapshot", { generatedAt: formattedDate })} onClose={onClose}>
            <TransactionList transactions={finding.evidenceTransactions} currencyCode={currencyCode}
                viewMode={viewMode} onChangeViewMode={setViewMode} onClickDetailTransaction={setDetail}
                totalElements={finding.evidenceTransactions.length} page={0} totalPages={1} onChangePage={() => {}} />
        </ExpenseRankingTransactionListDialog>
    );
}
