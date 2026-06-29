"use client";

import type React from "react";
import { AlertCircle, Search, UserX } from "lucide-react";
import { useTranslations } from "next-intl";

import type { UserSearchErrorCode } from "@/hooks/user-search/usePublicIdUserSearch";

interface UserSearchStatePanelProps {
    isSearching: boolean;
    hasSearched: boolean;
    searchErrorCode: UserSearchErrorCode | null;
}

export default function UserSearchStatePanel({
    isSearching,
    hasSearched,
    searchErrorCode,
}: UserSearchStatePanelProps) {
    const t = useTranslations("Social.userSearchPage.state");

    if (isSearching) {
        return (
            <StateCard
                icon={<Search className="h-7 w-7 animate-pulse" />}
                title={t("searchingTitle")}
                description={t("searchingDescription")}
            />
        );
    }

    if (searchErrorCode === "NOT_FOUND") {
        return (
            <StateCard
                icon={<UserX className="h-7 w-7" />}
                title={t("notFoundTitle")}
                description={t("notFoundDescription")}
            />
        );
    }

    if (searchErrorCode === "SEARCH_FAILED") {
        return (
            <StateCard
                icon={<AlertCircle className="h-7 w-7" />}
                title={t("failedTitle")}
                description={t("failedDescription")}
                danger
            />
        );
    }

    if (hasSearched) {
        return (
            <StateCard
                icon={<UserX className="h-7 w-7" />}
                title={t("emptyTitle")}
                description={t("emptyDescription")}
            />
        );
    }

    return (
        <StateCard
            icon={<Search className="h-7 w-7" />}
            title={t("initialTitle")}
            description={t("initialDescription")}
        />
    );
}

interface StateCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    danger?: boolean;
}

function StateCard({
    icon,
    title,
    description,
    danger = false,
}: StateCardProps) {
    return (
        <div
            className={`rounded-4xl border p-8 text-center ${
                danger
                    ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            }`}
        >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
                {icon}
            </div>
            <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
                {title}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6">
                {description}
            </p>
        </div>
    );
}
