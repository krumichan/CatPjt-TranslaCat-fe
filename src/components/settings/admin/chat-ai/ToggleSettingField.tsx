interface ToggleSettingFieldProps {
    label: string;
    help: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    testId?: string;
}

export function ToggleSettingField({
    label,
    help,
    checked,
    onChange,
    testId,
}: ToggleSettingFieldProps) {
    return (
        <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <span>
                <span className="block text-sm font-black text-slate-800 dark:text-slate-100">
                    {label}
                </span>
                <span className="mt-2 block text-xs leading-5 text-slate-400">
                    {help}
                </span>
            </span>

            <input
                type="checkbox"
                data-testid={testId}
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-violet-600"
            />
        </label>
    );
}
