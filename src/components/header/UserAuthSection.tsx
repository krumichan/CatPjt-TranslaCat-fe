"use strict"

import { LogIn, LogOut } from "lucide-react";
import { Link } from "@/navigation";
import { GeneralTranslation } from "@/types/common";

interface UserAuthSectionProps {
    status: "authenticated" | "loading" | "unauthenticated";
    userName?: string | null;
    handleLogout: () => void;
    onLinkClick: () => void;
    t: GeneralTranslation;
}

export default function UserAuthSection({
    status,
    userName,
    handleLogout,
    onLinkClick,
    t
}: UserAuthSectionProps) {
    return (
        <div className="border-t border-gray-100 dark:border-zinc-800 my-1">
            {status === "authenticated" ? (
                <>
                    <div className="px-4 py-3 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                        {userName} {t('welcome')}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium group"
                    >
                        <LogOut size={16} className="text-red-400 group-hover:scale-110 transition-transform shrink-0" />
                        <span className="font-semibold">{t('logout')}</span>
                    </button>
                </>
            ) : (
                <Link
                    href="/login"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-medium group"
                    onClick={onLinkClick}
                >
                    <LogIn size={16} className="group-hover:translate-x-1 transition-transform shrink-0" />
                    <span>{t('login')}</span>
                </Link>
            )}
        </div>
    );
}