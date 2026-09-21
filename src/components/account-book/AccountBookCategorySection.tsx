import { Folder } from "lucide-react";
import { useTranslations } from "next-intl";
import AccountBookListItem from "@/components/account-book/AccountBookListItem";
import {AccountBook, AccountBookCategoryGroup} from "@/types/accountBook";

type AccountBookCategorySectionProps = {
    category: AccountBookCategoryGroup;
    onEditAccountBook: (accountBook: AccountBook) => void;
    onDeleteAccountBook: (accountBook: AccountBook) => void;
    onManageMembers: (accountBook: AccountBook) => void;
};

export default function AccountBookCategorySection({
    category,
    onEditAccountBook,
    onDeleteAccountBook,
    onManageMembers,
}: AccountBookCategorySectionProps) {
    const t = useTranslations("AccountBook.category");

    return (
        <section className="min-w-0 rounded-3xl border border-white/70 bg-white/85 p-3 shadow-lg shadow-orange-100/50 backdrop-blur dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/30 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                        <Folder className="h-5 w-5" />
                    </span>

                    <div className="min-w-0">
                        <h2 className="break-all text-lg font-black text-slate-900 dark:text-white">
                            {category.name}
                        </h2>
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                            {t("count", {
                                count: category.accountBooks.length,
                            })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4">
                {category.accountBooks.map((accountBook) => (
                    <AccountBookListItem
                        key={accountBook.id}
                        accountBook={accountBook}
                        onEdit={onEditAccountBook}
                        onDelete={onDeleteAccountBook}
                        onManageMembers={onManageMembers}
                    />
                ))}
            </div>
        </section>
    );
}
