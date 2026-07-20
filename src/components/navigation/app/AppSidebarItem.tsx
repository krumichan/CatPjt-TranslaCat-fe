"use client";

import { useTranslations } from "next-intl";

import { AppNavigationTooltip } from "@/components/navigation/app/AppNavigationTooltip";
import type { AppNavigationItem } from "@/components/navigation/app/appNavigationTypes";
import { Link } from "@/navigation";

interface AppSidebarItemProps {
    item: AppNavigationItem;
    isActive: boolean;
    isCollapsed: boolean;
    onNavigate?: () => void;
}

export function AppSidebarItem({
    item,
    isActive,
    isCollapsed,
    onNavigate,
}: AppSidebarItemProps) {
    const t = useTranslations("Navigation");
    const Icon = item.icon;
    const label = t(item.labelKey);

    const badge = item.badge ? (
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
            {t(`badges.${item.badge}`)}
        </span>
    ) : null;

    const commonClassName = `group relative flex min-h-11 w-full items-center rounded-xl transition ${
        isCollapsed
            ? "justify-center px-2"
            : "gap-3 px-3"
    } ${
        isActive
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
    }`;

    if (item.disabled) {
        return (
            <button
                type="button"
                disabled
                aria-label={`${label} - ${t(
                    "badges.comingSoon",
                )}`}
                className={`${commonClassName} cursor-not-allowed opacity-55`}
            >
                <Icon
                    className="h-5 w-5 shrink-0"
                    aria-hidden="true"
                />

                {!isCollapsed && (
                    <>
                        <span className="min-w-0 flex-1 truncate text-left text-sm font-bold">
                            {label}
                        </span>
                        {badge}
                    </>
                )}

                {isCollapsed && (
                    <AppNavigationTooltip>
                        {label} · {t("badges.comingSoon")}
                    </AppNavigationTooltip>
                )}
            </button>
        );
    }

    return (
        <Link
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            aria-label={label}
            onClick={onNavigate}
            className={commonClassName}
        >
            <Icon
                className="h-5 w-5 shrink-0"
                aria-hidden="true"
            />

            {!isCollapsed && (
                <>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">
                        {label}
                    </span>
                    {badge}
                </>
            )}

            {isCollapsed && (
                <AppNavigationTooltip>
                    {label}
                </AppNavigationTooltip>
            )}
        </Link>
    );
}
