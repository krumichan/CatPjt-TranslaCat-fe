"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

import { AppSidebarItem } from "@/components/navigation/app/AppSidebarItem";
import { AppSidebarRecentHistory } from "@/components/navigation/app/AppSidebarRecentHistory";
import {
    APP_NAVIGATION_SECTIONS,
    isNavigationItemActive,
} from "@/components/navigation/app/appNavigationConfig";
import { usePathname } from "@/navigation";

interface AppNavigationContentProps {
    isCollapsed: boolean;
    onNavigate?: () => void;
}

export function AppNavigationContent({
    isCollapsed,
    onNavigate,
}: AppNavigationContentProps) {
    const pathname = usePathname();
    const t = useTranslations("Navigation");
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "ADMIN";

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <nav
                aria-label={t("primaryNavigation")}
                className="space-y-5 px-2"
            >
                {APP_NAVIGATION_SECTIONS.map((section) => (
                    <section key={section.key}>
                        {!isCollapsed && (
                            <h2 className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                                {t(
                                    `sections.${section.labelKey}`,
                                )}
                            </h2>
                        )}

                        <div className="space-y-1">
                            {section.items
                                .filter(
                                    (item) =>
                                        !item.adminOnly || isAdmin,
                                )
                                .map((item) => (
                                    <AppSidebarItem
                                        key={item.key}
                                        item={item}
                                        isActive={isNavigationItemActive(
                                            pathname,
                                            item,
                                        )}
                                        isCollapsed={isCollapsed}
                                        onNavigate={onNavigate}
                                    />
                                ))}
                        </div>
                    </section>
                ))}
            </nav>

            {!isCollapsed && isAdmin && (
                <section className="mt-6 min-h-0 border-t border-slate-200 px-2 pt-5 dark:border-white/10">
                    <h2 className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {t("sections.recentActivity")}
                    </h2>

                    <AppSidebarRecentHistory />
                </section>
            )}
        </div>
    );
}
