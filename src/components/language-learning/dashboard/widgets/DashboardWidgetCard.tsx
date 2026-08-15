import type { ReactNode } from "react";

interface DashboardWidgetCardProps {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}

export function DashboardWidgetCard({
    title,
    description,
    children,
    className = "",
}: DashboardWidgetCardProps) {
    return (
        <section className={`rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 ${className}`}>
            <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
                    {title}
                </h2>
                {description && (
                    <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                        {description}
                    </p>
                )}
            </div>
            <div className="mt-4">{children}</div>
        </section>
    );
}
