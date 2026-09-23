import TransactionDetailRow from "../TransactionDetailRow";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAmountFormatter } from "@/components/account-book/AccountBookCurrencyProvider";
import type { AccountBookTransaction, CurrencyCode } from "@/types/accountBook";
import { parseReceiptPaymentBreakdown } from "@/utils/account-book/transactionDetail";

type Props = {
    transaction: AccountBookTransaction;
    currencyCode: CurrencyCode;
    onClose: () => void;
    onEdit: (transaction: AccountBookTransaction) => void;
};

export default function TransactionDetailModal({ transaction, currencyCode, onClose, onEdit }: Props) {
    const t = useTranslations("AccountBook.detail.transactionDetail");
    const receiptT = useTranslations("AccountBook.detail.transactionModal.receipt.review");
    const formatAmount = useAmountFormatter();
    const payments = parseReceiptPaymentBreakdown(transaction.receiptPaymentBreakdownJson);
    const isReceipt = transaction.originalAmount != null || transaction.purchaseTotal != null
        || transaction.receiptAnalysisRevision != null;
    return createPortal(
        <div className="fixed inset-0 z-10000 overflow-y-auto px-2 py-3 sm:px-4 sm:py-12">
            <button
                type="button"
                aria-label={t("close")}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="transaction-detail-title"
                className="relative z-10 mx-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-6rem)] sm:p-6 dark:border-white/10 dark:bg-zinc-900"
            >
                <header className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-orange-500">
                            {t("eyebrow")}
                        </p>
                        <h2
                            id="transaction-detail-title"
                            className="mt-1 text-xl font-bold"
                        >
                            {transaction.title}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t("close")}
                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                        <X size={20} />
                    </button>
                </header>
                <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TransactionDetailRow
                        label={t("fields.type")}
                        value={t(`types.${transaction.type.toLowerCase()}`)}
                    />
                    <TransactionDetailRow
                        label={t("fields.title")}
                        value={transaction.title}
                    />
                    <TransactionDetailRow
                        label={t(transaction.type === "INCOME" ? "fields.incomeSource" : "fields.storeName")}
                        value={transaction.storeName}
                    />
                    <TransactionDetailRow
                        label={t("fields.category")}
                        value={transaction.category}
                    />
                    <TransactionDetailRow
                        label={t("fields.date")}
                        value={transaction.transactionDate}
                    />
                    <TransactionDetailRow
                        label={t("fields.amount")}
                        value={formatAmount(transaction.amount, currencyCode)}
                    />
                    <TransactionDetailRow
                        label={t("fields.memo")}
                        value={transaction.memo}
                    />
                </dl>
                {isReceipt && (
                    <section className="mt-6 rounded-2xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-500/30 dark:bg-orange-500/5">
                        <h3 className="font-bold text-slate-900 dark:text-white">
                            {t("receiptTitle")}
                        </h3>
                        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <TransactionDetailRow
                                label={receiptT("purchaseTotal")}
                                value={transaction.purchaseTotal == null ? null : `${transaction.purchaseTotal} ${transaction.originalCurrencyCode ?? ""}`.trim()}
                            />
                            <TransactionDetailRow
                                label={receiptT("bookAmount")}
                                value={transaction.bookAmount == null && transaction.originalAmount == null ? null : `${transaction.bookAmount ?? transaction.originalAmount} ${transaction.originalCurrencyCode ?? ""}`.trim()}
                            />
                            <TransactionDetailRow
                                label={receiptT("convertedAmount")}
                                value={formatAmount(transaction.amount, transaction.targetCurrencyCode ?? currencyCode)}
                            />
                            <TransactionDetailRow
                                label={receiptT("branchName")}
                                value={transaction.receiptBranchName}
                            />
                            <TransactionDetailRow
                                label={receiptT("transactionTime")}
                                value={transaction.receiptTransactionTime}
                            />
                            <TransactionDetailRow
                                label={receiptT("cashTendered")}
                                value={transaction.cashTendered == null ? null : `${transaction.cashTendered} ${transaction.originalCurrencyCode ?? ""}`.trim()}
                            />
                            <TransactionDetailRow
                                label={receiptT("change")}
                                value={transaction.changeAmount == null ? null : `${transaction.changeAmount} ${transaction.originalCurrencyCode ?? ""}`.trim()}
                            />
                            <TransactionDetailRow
                                label={t("fields.amountReason")}
                                value={transaction.amountReason}
                            />
                        </dl>
                        {payments.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    {receiptT("paymentBreakdown")}
                                </h4>
                                <ul className="mt-2 space-y-1">
                                    {payments.map((payment, index) => (
                                        <li
                                            key={`${payment.paymentType}-${index}`}
                                            className="flex flex-wrap justify-between gap-2 text-sm"
                                        >
                                            <span>
                                                {receiptT(`paymentTypes.${payment.paymentType}`)}
                                                {payment.evidence ? ` · ${payment.evidence}` : ""}
                                            </span>
                                            <strong>{payment.amount} {transaction.originalCurrencyCode}</strong>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <dl className="mt-4 grid grid-cols-1 gap-4 border-t border-orange-200 pt-4 sm:grid-cols-2 dark:border-orange-500/20">
                            <TransactionDetailRow
                                label={receiptT("exchangeRate")}
                                value={transaction.exchangeRate}
                            />
                            <TransactionDetailRow
                                label={receiptT("requestedDate")}
                                value={transaction.requestedRateDate}
                            />
                            <TransactionDetailRow
                                label={receiptT("effectiveDate")}
                                value={transaction.effectiveRateDate}
                            />
                            <TransactionDetailRow
                                label={receiptT("provider")}
                                value={transaction.exchangeRateProvider}
                            />
                            <TransactionDetailRow
                                label={receiptT("rateFetchedAt")}
                                value={transaction.rateFetchedAt}
                            />
                            <TransactionDetailRow
                                label={receiptT("convertedAt")}
                                value={transaction.convertedAt}
                            />
                            <TransactionDetailRow
                                label={t("fields.quoteId")}
                                value={transaction.conversionQuoteId}
                            />
                            <TransactionDetailRow
                                label={receiptT("roundingPolicy")}
                                value={transaction.roundingMode && transaction.roundingPrecision != null ? `${transaction.roundingMode} / ${transaction.roundingPrecision} / ${transaction.conversionPolicyVersion ?? "—"}` : null}
                            />
                        </dl>
                    </section>
                )}
                <footer className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
                    >
                        {t("close")}
                    </button>
                    <button
                        type="button"
                        onClick={() => onEdit(transaction)}
                        className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                        {t("edit")}
                    </button>
                </footer>
            </section>
        </div>,
        document.body
    );
}
