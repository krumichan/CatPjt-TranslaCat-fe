import type { ReactNode } from "react";

type Props = {
    id: string;
    label: string;
    required?: boolean;
    error?: string | null;
    hint?: string | null;
    children: ReactNode;
};

export default function TransactionField({ id, label, required = false, error, hint, children }: Props) {
    return (
        <div className="min-w-0">
            <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                {label} {required && <span className="text-orange-500" aria-hidden="true">*</span>}
            </label>
            {children}
            {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>}
            {!error && hint && <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
        </div>
    );
}
