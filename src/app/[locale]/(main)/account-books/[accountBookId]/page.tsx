"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import AccountBookDetailHeader from "@/components/account-book/detail/AccountBookDetailHeader";
import AccountBookDetailSummarySmartSection from "@/components/account-book/detail/summary/AccountBookDetailSummarySmartSection";
import AccountBookFixedCostSmartSection from "@/components/account-book/detail/fixed-cost/AccountBookFixedCostSmartSection";
import AccountBookTransactionSmartSection from "@/components/account-book/detail/transaction/AccountBookTransactionSmartSection";
import AccountBookMemberManageModal from "@/components/account-book/member/modal/AccountBookMemberManageModal";
import { useQuery } from "@/hooks/useQuery";
import { accountBookService } from "@/services/account-book/accountBookService";
import { accountBookDetailQueryKeys } from "@/hooks/account-book/detail/accountBookDetailQueryKeys";
import { getCurrentMonthValue } from "@/utils/account-book/detail/month";
import { canManageAccountBookMembers } from "@/utils/account-book/accountBookPermission";
import AccountBookLeaveSmartAction from "@/components/account-book/detail/leave/AccountBookLeaveSmartAction";

export default function AccountBookDetailPage() {
    const t = useTranslations("AccountBook.detail");
    const params = useParams<{ accountBookId: string }>();

    const accountBookId = Number(params.accountBookId);
    const isValidAccountBookId = Number.isFinite(accountBookId);

    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
    const [isCreateTransactionModalOpen, setIsCreateTransactionModalOpen] =
        useState(false);
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

    const {
        data: accountBookDetail,
        isLoading: isAccountBookDetailLoading,
    } = useQuery({
        keys: isValidAccountBookId
            ? accountBookDetailQueryKeys.detail(accountBookId)
            : null,
        fetcher: (_, accountBookId) => accountBookService.get(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    const canManageMembers = canManageAccountBookMembers(accountBookDetail);
    const currencyCode = accountBookDetail?.currencyCode ?? "JPY";

    return (
        <>
            <main className="min-h-[calc(100vh-60px)] px-4 pt-24 pb-12 text-gray-800 dark:text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    {isAccountBookDetailLoading ? (
                        <div className="mb-6 rounded-2xl border border-white/70 bg-white/80 p-6 text-sm font-semibold text-slate-500 shadow-lg dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                            {t("messages.loading")}
                        </div>
                    ) : accountBookDetail ? (
                        <AccountBookDetailHeader
                            accountBook={accountBookDetail}
                            onClickCreateTransaction={() =>
                                setIsCreateTransactionModalOpen(true)
                            }
                            canManageMembers={canManageMembers}
                            onClickManageMembers={() => setIsMemberModalOpen(true)}
                            actionSlot={
                                <AccountBookLeaveSmartAction
                                    accountBookId={accountBookId}
                                    accountBookName={accountBookDetail.name}
                                    myRole={accountBookDetail.myRole}
                                />
                            }
                        />
                    ) : (
                        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                            {t("messages.loadFailed")}
                        </div>
                    )}

                    {isValidAccountBookId && accountBookDetail && (
                        <>
                            <AccountBookDetailSummarySmartSection
                                accountBookId={accountBookId}
                                selectedMonth={selectedMonth}
                                fallbackCurrencyCode={currencyCode}
                            />

                            <AccountBookFixedCostSmartSection
                                accountBookId={accountBookId}
                                selectedMonth={selectedMonth}
                                currencyCode={currencyCode}
                            />

                            <AccountBookTransactionSmartSection
                                accountBookId={accountBookId}
                                selectedMonth={selectedMonth}
                                currencyCode={currencyCode}
                                isCreateModalOpen={isCreateTransactionModalOpen}
                                onCloseCreateModal={() =>
                                    setIsCreateTransactionModalOpen(false)
                                }
                                onChangeSelectedMonth={setSelectedMonth}
                            />
                        </>
                    )}
                </div>
            </main>

            {isMemberModalOpen && accountBookDetail && (
                <AccountBookMemberManageModal
                    accountBookId={accountBookId}
                    accountBookName={accountBookDetail.name}
                    onClose={() => setIsMemberModalOpen(false)}
                />
            )}
        </>
    );
}
