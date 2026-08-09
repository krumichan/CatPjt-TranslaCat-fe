interface TimeSettingFieldProps {
    label: string;
    help: string;
    value: string;
    onChange: (value: string) => void;
}

export function TimeSettingField({
    label,
    help,
    value,
    onChange,
}: TimeSettingFieldProps) {
    const normalized = value?.slice(0, 5) ?? "";

    return (
        <label className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                {label}
            </span>
            <input
                type="time"
                value={normalized}
                onChange={(event) => onChange(event.target.value)}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-white/5"
            />
            <span className="mt-2 block text-xs leading-5 text-slate-400">
                {help}
            </span>
        </label>
    );
}
