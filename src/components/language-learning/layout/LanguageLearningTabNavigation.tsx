"use client";

import {
    BarChart3,
    BookOpen,
    BookText,
    ChevronDown,
    Ear,
    History,
    Mic2,
    PencilLine,
    Settings,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/navigation";

const LEARNING_MODE_ITEMS = [
    {
        href: "/language-learning/writing",
        key: "writing",
        icon: PencilLine,
    },
    {
        href: "/language-learning/speaking",
        key: "speaking",
        icon: Mic2,
    },
    {
        href: "/language-learning/listening",
        key: "listening",
        icon: Ear,
    },
    {
        href: "/language-learning/reading",
        key: "reading",
        icon: BookText,
    },
] as const;

const PRIMARY_ITEMS = [
    {
        href: "/language-learning",
        key: "dashboard",
        icon: BarChart3,
    },
    {
        href: "/language-learning/history",
        key: "history",
        icon: History,
    },
    {
        href: "/language-learning/settings",
        key: "settings",
        icon: Settings,
    },
] as const;

function isPathActive(pathname: string, href: string) {
    return href === "/language-learning"
        ? pathname === href || pathname.startsWith("/language-learning/profile")
        : pathname.startsWith(href);
}

export function LanguageLearningTabNavigation() {
    const pathname = usePathname();
    const t = useTranslations("LanguageLearning.navigation");
    const learningActive = LEARNING_MODE_ITEMS.some((item) =>
        pathname.startsWith(item.href),
    );

    const dashboard = PRIMARY_ITEMS[0];
    const history = PRIMARY_ITEMS[1];
    const settings = PRIMARY_ITEMS[2];

    const renderPrimaryLink = (item: (typeof PRIMARY_ITEMS)[number]) => {
        const active = isPathActive(pathname, item.href);
        const Icon = item.icon;

        return (
            <Link
                key={item.key}
                href={item.href}
                aria-label={t(item.key)}
                aria-current={active ? "page" : undefined}
                data-testid={`language-learning-tab-${item.key}`}
                className={cn(
                    "inline-flex min-h-11 min-w-0 flex-col items-center justify-center gap-1",
                    "rounded-xl px-1 py-1 text-center text-xs font-bold",
                    "sm:flex-row sm:gap-2 sm:px-2 sm:py-2.5 sm:text-sm md:px-3",
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
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap sm:hidden">{t(`mobile.${item.key}`)}</span>
                <span className="hidden whitespace-nowrap sm:inline">{t(item.key)}</span>
            </Link>
        );
    };

    return (
        <nav
            aria-label={t("ariaLabel")}
            data-testid="language-learning-tabs"
            className={cn(
                "relative rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:p-1.5",
                "dark:border-slate-800 dark:bg-slate-900",
            )}
        >
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                {renderPrimaryLink(dashboard)}

                {/* 모바일 메뉴는 nav 전체 너비를 기준으로 펼쳐 좁은 화면에서도 잘리지 않게 한다. */}
                <details className="group static sm:relative" data-testid="language-learning-today-menu">
                    <summary
                        aria-label={t("todayLearning")}
                        className={cn(
                            "relative flex min-h-11 min-w-0 cursor-pointer list-none flex-col items-center justify-center gap-1",
                            "rounded-xl px-1 py-1 text-center text-xs font-bold",
                            "sm:flex-row sm:gap-2 sm:px-2 sm:py-2.5 sm:text-sm md:px-3",
                            "transition focus-visible:outline-none focus-visible:ring-2",
                            "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                            "dark:focus-visible:ring-offset-slate-900 [&::-webkit-details-marker]:hidden",
                            learningActive
                                ? "bg-blue-600 text-white shadow-sm"
                                : cn(
                                      "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                                      "dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                                  ),
                        )}
                    >
                        <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="whitespace-nowrap sm:hidden">{t("mobile.todayLearning")}</span>
                        <span className="hidden whitespace-nowrap sm:inline">{t("todayLearning")}</span>
                        <ChevronDown
                            className="absolute right-1 top-1.5 h-3 w-3 shrink-0 transition-transform group-open:rotate-180 sm:static sm:h-4 sm:w-4"
                            aria-hidden="true"
                        />
                    </summary>

                    <div
                        className={cn(
                            "absolute inset-x-0 top-[calc(100%+0.5rem)] z-50",
                            "max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain",
                            "rounded-2xl border border-slate-200",
                            "bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900",
                            "sm:left-1/2 sm:right-auto sm:w-72 sm:-translate-x-1/2",
                        )}
                    >
                        <p className="px-3 pb-2 pt-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                            {t("todayLearningDescription")}
                        </p>
                        <div className="space-y-1">
                            {LEARNING_MODE_ITEMS.map((item) => {
                                const active = pathname.startsWith(item.href);
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        aria-current={active ? "page" : undefined}
                                        data-testid={`language-learning-tab-${item.key}`}
                                        className={cn(
                                            "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5",
                                            "text-sm font-bold transition",
                                            active
                                                ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                                                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                                        )}
                                    >
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5">
                                            <Icon className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                        <span>{t(item.key)}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </details>

                {renderPrimaryLink(history)}
                {renderPrimaryLink(settings)}
            </div>
        </nav>
    );
}
