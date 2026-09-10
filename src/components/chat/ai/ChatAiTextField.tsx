"use client";

export function ChatAiTextField({
    label,
    value,
    maxLength,
    testId,
    onChange,
}: {
    label: string;
    value: string;
    maxLength: number;
    testId: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {label}
            <input
                data-testid={testId}
                value={value}
                maxLength={maxLength}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-900"
            />
        </label>
    );
}
