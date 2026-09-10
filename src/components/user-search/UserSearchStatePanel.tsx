"use client";

import { UserSearchStateCard } from "@/components/user-search/UserSearchStateCard";
import type { UserSearchErrorCode } from "@/hooks/user-search/usePublicIdUserSearch";
import { AlertCircle, Search, UserX } from "lucide-react";
import { useTranslations } from "next-intl";

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
            <UserSearchStateCard
                icon={<Search className="h-7 w-7 animate-pulse" />}
                title={t("searchingTitle")}
                description={t("searchingDescription")}
            />
        );
    }

    if (searchErrorCode === "NOT_FOUND") {
        return (
            <UserSearchStateCard
                icon={<UserX className="h-7 w-7" />}
                title={t("notFoundTitle")}
                description={t("notFoundDescription")}
            />
        );
    }

    if (searchErrorCode === "SEARCH_FAILED") {
        return (
            <UserSearchStateCard
                icon={<AlertCircle className="h-7 w-7" />}
                title={t("failedTitle")}
                description={t("failedDescription")}
                danger
            />
        );
    }

    if (hasSearched) {
        return (
            <UserSearchStateCard
                icon={<UserX className="h-7 w-7" />}
                title={t("emptyTitle")}
                description={t("emptyDescription")}
            />
        );
    }

    return (
        <UserSearchStateCard
            icon={<Search className="h-7 w-7" />}
            title={t("initialTitle")}
            description={t("initialDescription")}
        />
    );
}
