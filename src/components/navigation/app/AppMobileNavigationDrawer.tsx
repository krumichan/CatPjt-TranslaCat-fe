"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
    useEffect,
    useRef,
    type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import Logo from "@/components/layout/Logo";
import { AppNavigationContent } from "@/components/navigation/app/AppNavigationContent";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import ThemeSwitcher from "@/components/layout/ThemeSwitcher";

interface AppMobileNavigationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

export function AppMobileNavigationDrawer({
    isOpen,
    onClose,
}: AppMobileNavigationDrawerProps) {
    const t = useTranslations("Navigation.mobile");
    const drawerRef = useRef<HTMLDivElement>(null);
    const closeButtonRef =
        useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow =
            document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const focusTimer = window.setTimeout(() => {
            closeButtonRef.current?.focus();
        }, 0);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
            }

            if (
                event.key !== "Tab" ||
                !drawerRef.current
            ) {
                return;
            }

            const focusableElements = Array.from(
                drawerRef.current.querySelectorAll<HTMLElement>(
                    FOCUSABLE_SELECTOR,
                ),
            );

            if (focusableElements.length === 0) {
                return;
            }

            const first = focusableElements[0];
            const last =
                focusableElements[
                    focusableElements.length - 1
                ];

            if (
                event.shiftKey &&
                document.activeElement === first
            ) {
                event.preventDefault();
                last.focus();
            } else if (
                !event.shiftKey &&
                document.activeElement === last
            ) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            window.clearTimeout(focusTimer);
            document.body.style.overflow =
                previousOverflow;
            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [isOpen, onClose]);

    const stopPropagation = (
        event: ReactKeyboardEvent<HTMLDivElement>,
    ) => {
        event.stopPropagation();
    };

    return (
        <div
            aria-hidden={!isOpen}
            className={`fixed inset-0 z-140 lg:hidden ${
                isOpen
                    ? "pointer-events-auto"
                    : "pointer-events-none"
            }`}
        >
            <button
                type="button"
                tabIndex={isOpen ? 0 : -1}
                aria-label={t("close")}
                onClick={onClose}
                className={`absolute inset-0 bg-slate-950/55 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${
                    isOpen ? "opacity-100" : "opacity-0"
                }`}
            />

            <div
                ref={drawerRef}
                id="app-mobile-navigation-drawer"
                role="dialog"
                aria-modal="true"
                aria-label={t("title")}
                onKeyDown={stopPropagation}
                data-testid="app-mobile-navigation-drawer"
                className={`absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 motion-reduce:transition-none dark:border-white/10 dark:bg-slate-950 ${
                    isOpen
                        ? "translate-x-0"
                        : "-translate-x-full"
                }`}
            >
                <div className="flex h-15 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-white/10">
                    <Logo />

                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label={t("close")}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X
                            className="h-5 w-5"
                            aria-hidden="true"
                        />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto py-5">
                    <AppNavigationContent
                        isCollapsed={false}
                        onNavigate={onClose}
                    />
                </div>

                <div className="shrink-0 border-t border-slate-200 p-4 dark:border-white/10">
                    <div className="flex items-center justify-between">
                        <LanguageSwitcher placement="top" />
                        <ThemeSwitcher />
                    </div>
                </div>
            </div>
        </div>
    );
}
