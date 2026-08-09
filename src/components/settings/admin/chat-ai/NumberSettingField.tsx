interface NumberSettingFieldProps {
    label: string;
    help: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
}

export function NumberSettingField({
    label,
    help,
    value,
    min,
    max,
    step,
    onChange,
}: NumberSettingFieldProps) {
    return (
        <label className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                {label}
            </span>

            <input
                type="number"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={(event) => onChange(Number(event.target.value))}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-white/5"
            />

            <span className="mt-2 block text-xs leading-5 text-slate-400">
                {help}
            </span>
        </label>
    );
}