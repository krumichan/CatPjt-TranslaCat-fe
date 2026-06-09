import { CurrencyCode } from "@/types/accountBook";
import { formatNumberWithComma } from "@/utils/number/formatNumberInput";

type ExpenseGoalAmountInputProps = {
    currencyCode: CurrencyCode;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
};

export default function ExpenseGoalAmountInput({
   currencyCode,
   value,
   placeholder,
   onChange,
}: ExpenseGoalAmountInputProps) {
    return (
        <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-slate-50 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:focus-within:ring-orange-500/20">
            <div className="flex items-center border-r border-slate-300 px-4 text-sm font-bold text-slate-500 dark:border-white/10 dark:text-slate-300">
                {currencyCode}
            </div>

            <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={(event) => {
                    onChange(formatNumberWithComma(event.target.value));
                }}
                placeholder={placeholder}
                className="w-full bg-transparent px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
        </div>
    );
}