"use client";

import {
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { AppNavigationContent } from "@/components/navigation/app/AppNavigationContent";

interface AppSidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export function AppSidebar({
    isCollapsed,
    onToggle,
}: AppSidebarProps) {
    const t = useTranslations("Navigation.sidebar");
    const ToggleIcon = isCollapsed
        ? PanelLeftOpen
        : PanelLeftClose;

    return (
        <aside
            data-testid="app-sidebar"
            className={`fixed bottom-0 left-0 top-[60px] z-[90] hidden flex-col border-r border-slate-200 bg-white/95 py-3 shadow-sm backdrop-blur-xl transition-[width] duration-200 motion-reduce:transition-none dark:border-white/10 dark:bg-slate-950/95 lg:flex ${
                isCollapsed ? "w-[72px]" : "w-64"
            }`}
        >
            <div
                className={`mb-3 flex items-center ${
                    isCollapsed
                        ? "justify-center px-2"
                        : "justify-between px-3"
                }`}
            >
                {!isCollapsed && (
                    <p className="min-w-0 truncate px-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        {t("navigation")}
                    </p>
                )}

                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={!isCollapsed}
                    aria-label={
                        isCollapsed
                            ? t("expand")
                            : t("collapse")
                    }
                    data-testid="app-sidebar-toggle"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                    <ToggleIcon
                        className="h-5 w-5"
                        aria-hidden="true"
                    />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4">
                <AppNavigationContent
                    isCollapsed={isCollapsed}
                />
            </div>
        </aside>
    );
}
