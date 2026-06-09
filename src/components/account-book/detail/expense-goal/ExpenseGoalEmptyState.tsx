import { Target } from "lucide-react";

type ExpenseGoalEmptyStateProps = {
    message: string;
};

export default function ExpenseGoalEmptyState({
    message,
}: ExpenseGoalEmptyStateProps) {
    return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <Target size={20} />
                <p className="text-sm font-medium">{message}</p>
            </div>
        </div>
    );
}