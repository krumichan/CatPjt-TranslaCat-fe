"use client";

import { UserPlus, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

type FriendListEmptyStateProps = {
    onOpenFriendSearch: () => void;
};

export default function FriendListEmptyState({
    onOpenFriendSearch,
}: FriendListEmptyStateProps) {
    const t = useTranslations("Social.friendListPage.empty");

    return (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center dark:border-white/10 dark:bg-white/5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-200">
                <UsersRound className="h-8 w-8" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                {t("title")}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t("description")}
            </p>
            <button
                type="button"
                onClick={onOpenFriendSearch}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
            >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {t("action")}
            </button>
        </div>
    );
}
