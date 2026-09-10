"use client";

export function DisclosureAllButton({
    allOpen,
    onSetAll,
    expandAllLabel,
    collapseAllLabel,
}: {
    allOpen: boolean;
    onSetAll: (open: boolean) => void;
    expandAllLabel: string;
    collapseAllLabel: string;
}) {
    return (
        <button
            type="button"
            onClick={() => onSetAll(!allOpen)}
            className="inline-flex shrink-0 items-center justify-center rounded-xl px-3 py-2 text-xs font-black text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
        >
            {allOpen ? collapseAllLabel : expandAllLabel}
        </button>
    );
}
