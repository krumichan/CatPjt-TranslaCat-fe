"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import Logo from "@/components/layout/Logo";
import ThemeSwitcher from "@/components/layout/ThemeSwitcher";
import UserMenu from "@/components/layout/UserMenu";
import NotificationBell from "@/components/notification/NotificationBell";

interface HeaderProps {
    isMobileNavigationOpen: boolean;
    onOpenMobileNavigation: () => void;
}

export default function Header({
    isMobileNavigationOpen,
    onOpenMobileNavigation,
}: HeaderProps) {
    const t = useTranslations("Navigation.mobile");

    return (
        <header className="fixed left-0 right-0 top-0 z-100 flex h-15 items-center justify-between border-b border-slate-200 bg-white/90 px-2.5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
                <button
                    type="button"
                    onClick={onOpenMobileNavigation}
                    aria-controls="app-mobile-navigation-drawer"
                    aria-expanded={isMobileNavigationOpen}
                    aria-label={t("open")}
                    data-testid="mobile-navigation-open"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white lg:hidden"
                >
                    <Menu
                        className="h-5 w-5"
                        aria-hidden="true"
                    />
                </button>

                <div className="min-w-0">
                    <Logo className="text-xl sm:text-2xl" />
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <div className="hidden items-center gap-2 sm:flex">
                    <ThemeSwitcher />
                    <LanguageSwitcher />
                </div>

                <NotificationBell />
                <UserMenu />
            </div>
        </header>
    );
}