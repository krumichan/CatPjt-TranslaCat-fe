"use client";

interface AppNavigationTooltipProps {
    children: React.ReactNode;
}

export function AppNavigationTooltip({
    children,
}: AppNavigationTooltipProps) {
    return (
        <span
            role="tooltip"
            className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-[130] hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-lg group-hover:block group-focus-visible:block dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
        >
            {children}
        </span>
    );
}
