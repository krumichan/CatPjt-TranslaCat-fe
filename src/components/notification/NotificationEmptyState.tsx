type NotificationEmptyStateProps = {
    title: string;
    description: string;
};

export default function NotificationEmptyState({
    title,
    description,
}: NotificationEmptyStateProps) {
    return (
        <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center dark:bg-black/25">
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">
                {title}
            </p>

            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {description}
            </p>
        </div>
    );
}