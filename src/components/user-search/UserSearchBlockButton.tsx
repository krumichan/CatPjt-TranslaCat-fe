"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

export function UserSearchBlockButton({
    isBlocking,
    onBlockUser,
}: {
    isBlocking: boolean;
    onBlockUser: () => Promise<boolean>;
}) {
    const t = useTranslations("Social.userSearchPage.actions");

    return (
        <button
            type="button"
            onClick={onBlockUser}
            disabled={isBlocking}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
        >
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            {isBlocking ? t("blocking") : t("block")}
        </button>
    );
}
