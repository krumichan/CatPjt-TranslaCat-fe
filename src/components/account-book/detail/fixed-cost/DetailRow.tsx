type DetailRowProps = {
    label: string;
    value: string;
    valueClassName?: string;
};

export default function DetailRow({
    label,
    value,
    valueClassName = "text-slate-800 dark:text-slate-100",
}: DetailRowProps) {
    return (
        <div className="flex items-start justify-between gap-4">
            <p className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {label}
            </p>
            <p className={`text-right text-sm font-semibold ${valueClassName}`}>
                {value}
            </p>
        </div>
    );
}