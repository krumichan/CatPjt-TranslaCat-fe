type TransactionPaginationProps = {
    page: number;
    totalPages: number;
    isLoading?: boolean;
    previousLabel: string;
    nextLabel: string;
    onChangePage: (page: number) => void;
};

export default function TransactionPagination({
    page,
    totalPages,
    isLoading = false,
    previousLabel,
    nextLabel,
    onChangePage,
}: TransactionPaginationProps) {
    return (
        <div className="mt-4 flex items-center justify-center gap-3">
            <button
                type="button"
                disabled={page <= 0 || isLoading}
                onClick={() => onChangePage(Math.max(page - 1, 0))}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300"
            >
                {previousLabel}
            </button>

            <span className="text-sm text-slate-500 dark:text-slate-400">
                {page + 1} / {Math.max(totalPages, 1)}
            </span>

            <button
                type="button"
                disabled={
                    isLoading ||
                    totalPages === 0 ||
                    page + 1 >= totalPages
                }
                onClick={() => onChangePage(page + 1)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300"
            >
                {nextLabel}
            </button>
        </div>
    );
}