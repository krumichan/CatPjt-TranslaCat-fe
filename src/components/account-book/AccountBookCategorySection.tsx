import { Folder } from "lucide-react";
import { AccountBookCategory } from "@/types/accountBook";
import AccountBookListItem from "@/components/account-book/AccountBookListItem";

type AccountBookCategorySectionProps = {
    category: AccountBookCategory;
    onDeleteAccountBook: (accountBookId: string) => void;
};

export default function AccountBookCategorySection({
                                                       category,
                                                       onDeleteAccountBook,
                                                   }: AccountBookCategorySectionProps) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.14)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/80 dark:shadow-xl">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                        <Folder size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">{category.name}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {category.accountBooks.length}개 가계부
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {category.accountBooks.map((accountBook) => (
                    <AccountBookListItem
                        key={accountBook.id}
                        accountBook={accountBook}
                        onDelete={onDeleteAccountBook}
                    />
                ))}
            </div>
        </div>
    );
}