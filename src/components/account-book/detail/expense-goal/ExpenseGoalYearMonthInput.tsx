import { useRef } from "react";

type ExpenseGoalYearMonthInputProps = {
    year: string;
    month: string;
    yearSuffix: string;
    monthSuffix: string;
    onChangeYear: (year: string) => void;
    onChangeMonth: (month: string) => void;
};

export default function ExpenseGoalYearMonthInput({
    year,
    month,
    yearSuffix,
    monthSuffix,
    onChangeYear,
    onChangeMonth,
}: ExpenseGoalYearMonthInputProps) {
    const yearInputRef = useRef<HTMLInputElement | null>(null);
    const monthInputRef = useRef<HTMLInputElement | null>(null);

    return (
        <div className="flex items-center gap-2">
            <input
                ref={yearInputRef}
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={year}
                onFocus={(event) => event.target.select()}
                onChange={(event) => {
                    const value = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4);

                    onChangeYear(value);

                    if (value.length === 4) {
                        monthInputRef.current?.focus();
                        monthInputRef.current?.select();
                    }
                }}
                className="w-24 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-center text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:ring-orange-500/20"
                placeholder="2026"
            />

            <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">
                {yearSuffix}
            </span>

            <input
                ref={monthInputRef}
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={month}
                onFocus={(event) => event.target.select()}
                onChange={(event) => {
                    const value = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 2);

                    if (!value) {
                        onChangeMonth("");
                        return;
                    }

                    if (Number(value) > 12) {
                        onChangeMonth("12");
                        return;
                    }

                    onChangeMonth(value);
                }}
                onBlur={() => {
                    if (!month) {
                        return;
                    }

                    const normalizedMonth = String(Number(month)).padStart(2, "0");
                    onChangeMonth(normalizedMonth);
                }}
                className="w-20 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-center text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:ring-orange-500/20"
                placeholder="06"
            />

            <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">
                {monthSuffix}
            </span>
        </div>
    );
}