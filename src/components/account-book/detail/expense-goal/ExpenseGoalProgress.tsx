type ExpenseGoalProgressProps = {
    progressRate: number;
    usageRate: number;
    isExceeded: boolean;
    usageRateLabel: string;
};

export default function ExpenseGoalProgress({
    progressRate,
    usageRate,
    isExceeded,
    usageRateLabel,
}: ExpenseGoalProgressProps) {
    return (
        <>
            <div className="mb-3 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-black/30">
                <div
                    className={
                        isExceeded
                            ? "h-full rounded-full bg-red-500"
                            : "h-full rounded-full bg-orange-400"
                    }
                    style={{ width: `${progressRate}%` }}
                />
            </div>

            <div className="mb-4 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500 dark:text-slate-400">
                    {usageRateLabel}
                </span>

                <span
                    className={
                        isExceeded
                            ? "font-bold text-red-500 dark:text-red-400"
                            : "font-bold text-slate-900 dark:text-white"
                    }
                >
                    {usageRate}%
                </span>
            </div>
        </>
    );
}