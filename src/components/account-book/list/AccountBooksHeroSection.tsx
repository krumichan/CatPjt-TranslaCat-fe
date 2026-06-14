import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import AccountBookSearchPanel from "@/components/account-book/AccountBookSearchPanel";

type AccountBooksHeroSectionProps = {
    searchKeyword: string;
    selectedCategory: string;
    categoryOptions: string[];
    totalAccountBookCount: number;
    onChangeSearchKeyword: (keyword: string) => void;
    onChangeCategory: (category: string) => void;
    onOpenCreateModal: () => void;
};

export default function AccountBooksHeroSection({
    searchKeyword,
    selectedCategory,
    categoryOptions,
    totalAccountBookCount,
    onChangeSearchKeyword,
    onChangeCategory,
    onOpenCreateModal,
}: AccountBooksHeroSectionProps) {
    const t = useTranslations("AccountBook");

    return (
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
                    onClick={onOpenCreateModal}
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
                onChangeSearchKeyword={onChangeSearchKeyword}
                onChangeCategory={onChangeCategory}
            />
        </section>
    );
}
