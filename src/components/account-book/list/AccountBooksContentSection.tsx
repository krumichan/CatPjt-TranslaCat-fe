import { useTranslations } from "next-intl";
import { AccountBook, AccountBookCategoryGroup } from "@/types/accountBook";
import AccountBookCategorySection from "@/components/account-book/AccountBookCategorySection";
import EmptyAccountBookList from "@/components/account-book/EmptyAccountBookList";

type AccountBooksContentSectionProps = {
    isLoading: boolean;
    isError: unknown;
    categories: AccountBookCategoryGroup[];
    onEditAccountBook: (accountBook: AccountBook) => void;
    onDeleteAccountBook: (accountBook: AccountBook) => void;
    onManageMembers: (accountBook: AccountBook) => void;
};

export default function AccountBooksContentSection({
    isLoading,
    isError,
    categories,
    onEditAccountBook,
    onDeleteAccountBook,
    onManageMembers,
}: AccountBooksContentSectionProps) {
    const t = useTranslations("AccountBook");

    if (isLoading) {
        return (
            <div className="rounded-3xl border border-white/70 bg-white/80 p-8 text-center text-sm font-semibold text-slate-500 shadow-lg dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                {t("messages.loading")}
            </div>
        );
    }

    return (
        <>
            {isError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    {t("messages.loadFailed")}
                </div>
            )}

            {categories.length === 0 ? (
                <EmptyAccountBookList />
            ) : (
                <section className="flex flex-col gap-6">
                    {categories.map((category) => (
                        <AccountBookCategorySection
                            key={category.id}
                            category={category}
                            onEditAccountBook={onEditAccountBook}
                            onDeleteAccountBook={onDeleteAccountBook}
                            onManageMembers={onManageMembers}
                        />
                    ))}
                </section>
            )}
        </>
    );
}
