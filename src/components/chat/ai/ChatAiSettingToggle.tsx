"use client";

export function ChatAiSettingToggle({
    label,
    description,
    checked,
    disabled,
    testId,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    disabled: boolean;
    testId: string;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <span>
                <span className="block text-sm font-black text-slate-800 dark:text-slate-100">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span>
            </span>
            <input
                data-testid={testId}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
                className="mt-1 h-5 w-5 accent-violet-600"
            />
        </label>
    );
}
