"use client";

import {
    CircleUserRound,
    LogIn,
    LogOut,
    Settings,
    UserRound,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import {
    useEffect,
    useRef,
    useState,
} from "react";

import { Link } from "@/navigation";

export default function UserMenu() {
    const { data: session, status } = useSession();
    const t = useTranslations("Navigation");
    const locale = useLocale();

    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(
                    event.target as Node,
                )
            ) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handlePointerDown,
        );
        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handlePointerDown,
            );
            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [isOpen]);

    const handleLogout = async () => {
        setIsOpen(false);
        await signOut({
            callbackUrl: `/${locale}`,
        });
    };

    const userName =
        session?.user?.name ??
        session?.user?.email ??
        "";

    return (
        <div ref={menuRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={t("userMenu")}
                data-testid="user-menu-toggle"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
                <CircleUserRound
                    className="h-5 w-5"
                    aria-hidden="true"
                />
            </button>

            {isOpen && (
                <div
                    role="menu"
                    aria-label={t("userMenu")}
                    className="absolute right-0 top-[calc(100%+0.65rem)] z-[150] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-slate-900"
                >
                    {status === "authenticated" ? (
                        <>
                            <div className="mb-2 rounded-xl bg-slate-50 px-3 py-3 dark:bg-white/5">
                                <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                                    {userName}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                    {t("welcome")}
                                </p>
                            </div>

                            <Link
                                href="/settings/profile"
                                role="menuitem"
                                onClick={() =>
                                    setIsOpen(false)
                                }
                                className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                            >
                                <UserRound
                                    className="h-4.5 w-4.5"
                                    aria-hidden="true"
                                />
                                {t("profile")}
                            </Link>

                            <Link
                                href="/settings"
                                role="menuitem"
                                onClick={() =>
                                    setIsOpen(false)
                                }
                                className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                            >
                                <Settings
                                    className="h-4.5 w-4.5"
                                    aria-hidden="true"
                                />
                                {t("settings")}
                            </Link>

                            <div className="my-1 border-t border-slate-200 dark:border-white/10" />

                            <button
                                type="button"
                                role="menuitem"
                                onClick={() =>
                                    void handleLogout()
                                }
                                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                            >
                                <LogOut
                                    className="h-4.5 w-4.5"
                                    aria-hidden="true"
                                />
                                {t("logout")}
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            role="menuitem"
                            onClick={() => setIsOpen(false)}
                            className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <LogIn
                                className="h-4.5 w-4.5"
                                aria-hidden="true"
                            />
                            {t("login")}
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
