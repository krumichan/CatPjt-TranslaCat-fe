"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
    AccountBook,
    AccountBookCategoryGroup,
    CreateAccountBookFormValues,
    Currency,
} from "@/types/accountBook";
import AccountBookSearchPanel from "@/components/account-book/AccountBookSearchPanel";
import AccountBookCategorySection from "@/components/account-book/AccountBookCategorySection";
import EmptyAccountBookList from "@/components/account-book/EmptyAccountBookList";
import AccountBookCreateModal from "@/components/account-book/modal/AccountBookCreateModal";
import { accountBookService } from "@/services/account-book/accountBookService";
import { currencyService } from "@/services/currency/currencyService";

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
    const [accountBooks, setAccountBooks] = useState<AccountBook[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCurrencyLoading, setIsCurrencyLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadAccountBooks = useCallback(async () => {
        try {
            setIsLoading(true);
            setErrorMessage(null);

            const items = await accountBookService.list({
                keyword: searchKeyword,
                category: selectedCategory,
            });

            setAccountBooks(items);
        } catch (error) {
            console.error(error);
            setErrorMessage(t("messages.loadFailed"));
        } finally {
            setIsLoading(false);
        }
    }, [searchKeyword, selectedCategory, t]);

    const loadCurrencies = useCallback(async () => {
        try {
            setIsCurrencyLoading(true);
            const items = await currencyService.list();
            setCurrencies(items);
        } catch (error) {
            console.error(error);
        } finally {
            setIsCurrencyLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadCurrencies();
    }, [loadCurrencies]);

    useEffect(() => {
        void loadAccountBooks();
    }, [loadAccountBooks]);

    const categories = useMemo(
        () => groupAccountBooksByCategory(accountBooks),
        [accountBooks]
    );

    const categoryOptions = useMemo(
        () => categories.map((category) => category.name),
        [categories]
    );

    const totalAccountBookCount = accountBooks.length;

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
            await accountBookService.register({
                name: values.name,
                description: values.description,
                category,
                currencyCode: values.currencyCode,
                expenseGoalAmount: values.expenseGoalAmount,
            });

            await loadAccountBooks();
        } catch (error) {
            console.error(error);
            window.alert(t("messages.createFailed"));
        }
    };

    const handleDelete = (accountBookId: number) => {
        window.alert(t("messages.deleteNotReady"));
        console.log("delete target:", accountBookId);
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

                {errorMessage && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        {errorMessage}
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
        </>
    );
}