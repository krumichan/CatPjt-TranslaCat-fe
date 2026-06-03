"use client";

import React, { useMemo, useState } from "react";
import {
    AccountBook,
    AccountBookCategory,
    CreateAccountBookFormValues
} from "@/types/accountBook";
import { mockCategories } from "@/data/account-book/mockAccountBooks";
import AccountBookSearchPanel from "@/components/account-book/AccountBookSearchPanel";
import AccountBookCategorySection from "@/components/account-book/AccountBookCategorySection";
import EmptyAccountBookList from "@/components/account-book/EmptyAccountBookList";
import AccountBookCreateModal from "@/components/account-book/modal/AccountBookCreateModal";
import {Plus} from "lucide-react";

function createClientId(prefix: string) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}`;
}

export default function AccountBooksPage() {
    const [searchKeyword, setSearchKeyword] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [categories, setCategories] =
        useState<AccountBookCategory[]>(mockCategories);

    const filteredCategories = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();

        if (!keyword) {
            return categories;
        }

        return categories
            .map((category) => ({
                ...category,
                accountBooks: category.accountBooks.filter((accountBook) => {
                    return (
                        accountBook.name.toLowerCase().includes(keyword) ||
                        accountBook.description?.toLowerCase().includes(keyword) ||
                        category.name.toLowerCase().includes(keyword)
                    );
                }),
            }))
            .filter((category) => category.accountBooks.length > 0);
    }, [categories, searchKeyword]);

    const handleCreateAccountBook = (
        values: CreateAccountBookFormValues
    ) => {
        const newAccountBook: AccountBook = {
            id: createClientId("ab"),
            name: values.name,
            description: values.description,
            currencyCode: values.currencyCode,
            incomeAmount: 0,
            expenseAmount: 0,
            balance: 0,
            transactionCount: 0,
        };

        setCategories((prevCategories) => {
            if (values.categoryMode === "NEW") {
                const newCategory: AccountBookCategory = {
                    id: createClientId("category"),
                    name: values.newCategoryName ?? "새 카테고리",
                    accountBooks: [newAccountBook],
                };

                return [...prevCategories, newCategory];
            }

            return prevCategories.map((category) => {
                if (category.id !== values.categoryId) {
                    return category;
                }

                return {
                    ...category,
                    accountBooks: [...category.accountBooks, newAccountBook],
                };
            });
        });
    };

    const handleDelete = (accountBookId: string) => {
        const confirmed = window.confirm("이 가계부를 삭제하시겠습니까?");

        if (!confirmed) {
            return;
        }

        setCategories((prevCategories) =>
            prevCategories
                .map((category) => ({
                    ...category,
                    accountBooks: category.accountBooks.filter(
                        (accountBook) => accountBook.id !== accountBookId
                    ),
                }))
                .filter((category) => category.accountBooks.length > 0)
        );
    };

    const totalAccountBookCount = categories.reduce(
        (total, category) => total + category.accountBooks.length,
        0
    );

    return (
        <>
            <main className="min-h-[calc(100vh-60px)] px-4 pt-20 pb-12 text-gray-800 dark:text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <section className="mb-8">
                        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="mb-2 text-sm font-medium text-orange-500">
                                    Account Book
                                </p>
                                <h1 className="text-3xl font-bold tracking-tight">가계부</h1>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    카테고리별로 가계부를 관리하고, 지출/수입 내역을 확인합니다.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 hover:shadow-[0_14px_28px_rgba(249,115,22,0.34)]"
                            >
                                <Plus size={18} />
                                신규 가계부 작성
                            </button>
                        </div>

                        <AccountBookSearchPanel
                            searchKeyword={searchKeyword}
                            totalAccountBookCount={totalAccountBookCount}
                            onChangeSearchKeyword={setSearchKeyword}
                        />
                    </section>

                    <section className="space-y-6">
                        {filteredCategories.length === 0 ? (
                            <EmptyAccountBookList />
                        ) : (
                            filteredCategories.map((category) => (
                                <AccountBookCategorySection
                                    key={category.id}
                                    category={category}
                                    onDeleteAccountBook={handleDelete}
                                />
                            ))
                        )}
                    </section>
                </div>
            </main>

            <AccountBookCreateModal
                isOpen={isCreateModalOpen}
                categories={categories}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateAccountBook}
            />
        </>
    );
}