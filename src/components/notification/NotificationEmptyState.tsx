type NotificationEmptyStateProps = {
    title: string;
    description: string;
};

export default function NotificationEmptyState({
    title,
    description,
}: NotificationEmptyStateProps) {
    return (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center ring-1 ring-slate-200 dark:bg-black/20 dark:ring-0">
            <p className="text-sm font-black text-slate-900 dark:text-white">
                {title}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {description}
            </p>
        </div>
    );
}
