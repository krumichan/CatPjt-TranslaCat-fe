"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
    AccountBook,
    AccountBookCategoryGroup,
    AccountBookEditFormValues,
    CreateAccountBookFormValues, Currency,
} from "@/types/accountBook";
import AccountBookSearchPanel from "@/components/account-book/AccountBookSearchPanel";
import AccountBookCategorySection from "@/components/account-book/AccountBookCategorySection";
import EmptyAccountBookList from "@/components/account-book/EmptyAccountBookList";
import AccountBookCreateModal from "@/components/account-book/modal/AccountBookCreateModal";
import AccountBookEditModal from "@/components/account-book/modal/AccountBookEditModal";
import { accountBookService } from "@/services/account-book/accountBookService";
import { currencyService } from "@/services/currency/currencyService";
import { useQuery } from "@/hooks/useQuery";
import {accountBookMonthlyGoalService} from "@/services/account-book/accountBookMonthlyGoalService";
import {getCurrentYearMonth} from "@/utils/dateUtils";

function groupAccountBooksByCategory(
    accountBooks: AccountBook[]
): AccountBookCategoryGroup[] {
    const categoryMap = new Map<string, AccountBook[]>();

    accountBooks.forEach((accountBook) => {
        const categoryName = accountBook.category || "기타";
        const currentItems = categoryMap.get(categoryName) ?? [];

        categoryMap.set(categoryName, [...currentItems, accountBook]);
    });

    return Array.from(categoryMap.entries()).map(([categoryName, items]) => ({
        id: categoryName,
        name: categoryName,
        accountBooks: items,
    }));
}

export default function AccountBooksPage() {
    const t = useTranslations("AccountBook");

    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingAccountBook, setEditingAccountBook] =
        useState<AccountBook | null>(null);

    const [editingLoadingAccountBookId, setEditingLoadingAccountBookId] =
        useState<number | null>(null);

    const {
        data: accountBooks = [],
        isLoading,
        isError: accountBooksQueryError,
        mutate: mutateAccountBooks,
    } = useQuery({
        keys: ["account-books", searchKeyword, selectedCategory] as const,
        fetcher: (_, keyword, category) =>
            accountBookService.list({
                keyword,
                category,
            }),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    const {
        data: currenciesData,
        isLoading: isCurrencyLoading,
    } = useQuery({
        keys: ["currencies"] as const,
        fetcher: async (_key): Promise<Currency[]> => {
            return currencyService.list();
        },
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 5000,
        },
    });

    const currencies = currenciesData ?? [];

    const categories = useMemo(
        () => groupAccountBooksByCategory(accountBooks),
        [accountBooks]
    );

    const categoryOptions = useMemo(
        () => categories.map((category) => category.name),
        [categories]
    );

    const totalAccountBookCount = accountBooks.length;

    const handleRevalidateAccountBooks = async () => {
        await mutateAccountBooks((currentData) => currentData, true);
    };

    const handleCreateAccountBook = async (
        values: CreateAccountBookFormValues
    ) => {
        const category =
            values.categoryMode === "NEW"
                ? values.newCategoryName?.trim()
                : values.categoryName?.trim();

        if (!category) {
            return;
        }

        try {
            const createdAccountBook = await accountBookService.register({
                name: values.name,
                description: values.description,
                category,
                currencyCode: values.currencyCode,
            });

            if (values.expenseGoalAmount && values.expenseGoalAmount > 0) {
                const { year, month } = getCurrentYearMonth();

                await accountBookMonthlyGoalService.saveMonthlyGoal(createdAccountBook.id, {
                    year,
                    month,
                    goalAmount: values.expenseGoalAmount,
                });
            }

            await handleRevalidateAccountBooks();
        } catch (error) {
            console.error(error);
            window.alert(t("messages.createFailed"));
            throw error;
        }
    };

    const handleDelete = async (accountBookId: number) => {
        const confirmed = window.confirm(t("messages.deleteConfirm"));

        if (!confirmed) {
            return;
        }

        try {
            await accountBookService.remove(accountBookId);

            await mutateAccountBooks((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.filter(
                    (accountBook) => accountBook.id !== accountBookId
                );
            }, false);

            await handleRevalidateAccountBooks();
        } catch (error) {
            console.error(error);
            window.alert(t("messages.deleteFailed"));
        }
    };

    const handleEdit = async (accountBook: AccountBook) => {
        const { year, month } = getCurrentYearMonth();

        try {
            setEditingLoadingAccountBookId(accountBook.id);

            const monthlyGoal =
                await accountBookMonthlyGoalService.getMonthlyGoal(
                    accountBook.id,
                    year,
                    month
                );

            setEditingAccountBook({
                ...accountBook,
                expenseGoalAmount: monthlyGoal.goalAmount ?? null,
            });
        } catch (error) {
            console.error(error);
            window.alert(t("messages.loadGoalFailed"));
        } finally {
            setEditingLoadingAccountBookId(null);
        }
    };

    const handleUpdateAccountBook = async (
        accountBookId: number,
        values: AccountBookEditFormValues
    ) => {
        const {
            expenseGoalAmount,
            shouldDeleteMonthlyGoal,
            ...accountBookUpdateRequest
        } = values;

        try {
            const updatedAccountBook = await accountBookService.update(
                accountBookId,
                accountBookUpdateRequest
            );

            const { year, month } = getCurrentYearMonth();

            if (expenseGoalAmount && expenseGoalAmount > 0) {
                await accountBookMonthlyGoalService.saveMonthlyGoal(accountBookId, {
                    year,
                    month,
                    goalAmount: expenseGoalAmount,
                });
            } else if (shouldDeleteMonthlyGoal) {
                await accountBookMonthlyGoalService.deleteMonthlyGoal(
                    accountBookId,
                    year,
                    month
                );
            }

            await mutateAccountBooks((currentData) => {
                if (!currentData) {
                    return [updatedAccountBook];
                }

                return currentData.map((accountBook) =>
                    accountBook.id === accountBookId
                        ? {
                            ...updatedAccountBook,
                            expenseGoalAmount,
                        }
                        : accountBook
                );
            }, false);

            setEditingAccountBook(null);

            await handleRevalidateAccountBooks();
        } catch (error) {
            console.error(error);
            window.alert(t("messages.updateFailed"));
            throw error;
        }
    };

    return (
        <>
            <main className="mx-auto flex w-full pt-20 max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
                <section className="flex flex-col gap-5 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-orange-100/60 backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/30 sm:p-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                                {t("eyebrow")}
                            </p>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
                                {t("title")}
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-300">
                                {t("description")}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 hover:shadow-[0_14px_28px_rgba(249,115,22,0.34)]"
                        >
                            <Plus className="h-4 w-4" />
                            {t("actions.create")}
                        </button>
                    </div>

                    <AccountBookSearchPanel
                        searchKeyword={searchKeyword}
                        selectedCategory={selectedCategory}
                        categoryOptions={categoryOptions}
                        totalAccountBookCount={totalAccountBookCount}
                        onChangeSearchKeyword={setSearchKeyword}
                        onChangeCategory={setSelectedCategory}
                    />
                </section>

                {accountBooksQueryError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        {t("messages.loadFailed")}
                    </div>
                )}

                {isLoading ? (
                    <div className="rounded-3xl border border-white/70 bg-white/80 p-8 text-center text-sm font-semibold text-slate-500 shadow-lg dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                        {t("messages.loading")}
                    </div>
                ) : categories.length === 0 ? (
                    <EmptyAccountBookList />
                ) : (
                    <section className="flex flex-col gap-6">
                        {categories.map((category) => (
                            <AccountBookCategorySection
                                key={category.id}
                                category={category}
                                onEditAccountBook={handleEdit}
                                onDeleteAccountBook={handleDelete}
                            />
                        ))}
                    </section>
                )}
            </main>

            <AccountBookCreateModal
                isOpen={isCreateModalOpen}
                categoryOptions={categoryOptions}
                currencies={currencies}
                isCurrencyLoading={isCurrencyLoading}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateAccountBook}
            />

            <AccountBookEditModal
                isOpen={editingAccountBook !== null}
                accountBook={editingAccountBook}
                categoryOptions={categoryOptions}
                isMonthlyGoalLoading={editingLoadingAccountBookId !== null}
                onClose={() => setEditingAccountBook(null)}
                onSubmit={handleUpdateAccountBook}
            />
        </>
    );
}