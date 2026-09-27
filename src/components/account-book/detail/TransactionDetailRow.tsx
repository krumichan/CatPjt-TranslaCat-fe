type Props = {
    label: string;
    value: string | number | null | undefined;
};

export default function TransactionDetailRow({ label, value }: Props) {
    if (value == null || value === "")
        return null;
    return (
        <div className="min-w-0">
            <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {label}
            </dt>
            <dd className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-white">
                {value}
            </dd>
        </div>
    );
}
