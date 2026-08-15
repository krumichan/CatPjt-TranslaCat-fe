"use client";

import {
    BarChart3,
    History,
    Settings,
    Sparkles,
    UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/navigation";

const NAV_ITEMS = [
    {
        href: "/language-learning",
        key: "dashboard",
        icon: BarChart3,
    },
    {
        href: "/language-learning/writing",
        key: "writing",
        icon: Sparkles,
    },
    {
        href: "/language-learning/history",
        key: "history",
        icon: History,
    },
    {
        href: "/language-learning/profile",
        key: "profile",
        icon: UserRound,
    },
    {
        href: "/language-learning/settings",
        key: "settings",
        icon: Settings,
    },
] as const;

export function LanguageLearningTabNavigation() {
    const pathname = usePathname();
    const t = useTranslations("LanguageLearning.navigation");

    return (
        <nav
            aria-label={t("ariaLabel")}
            data-testid="language-learning-tabs"
            className={cn(
                "rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm",
                "dark:border-slate-800 dark:bg-slate-900",
            )}
        >
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
                {NAV_ITEMS.map((item) => {
                    const active =
                        item.href === "/language-learning"
                            ? pathname === item.href
                            : pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            data-testid={`language-learning-tab-${item.key}`}
                            className={cn(
                                "inline-flex min-h-11 items-center justify-center gap-2",
                                "rounded-xl px-3 py-2.5 text-center text-sm font-bold",
                                "transition focus-visible:outline-none focus-visible:ring-2",
                                "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                                "dark:focus-visible:ring-offset-slate-900",
                                active
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : cn(
                                          "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                                          "dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                                      ),
                            )}
                        >
                            <Icon
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>{t(item.key)}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
