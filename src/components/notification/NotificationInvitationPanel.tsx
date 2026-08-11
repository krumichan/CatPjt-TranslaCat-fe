import type React from "react";
import { useMemo, useState } from "react";
import { BookOpen, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

import InvitationNotificationUnifiedItem from "@/components/notification/InvitationNotificationUnifiedItem";
import NotificationEmptyState from "@/components/notification/NotificationEmptyState";
import type { FriendRequestAction } from "@/components/notification/useNotificationCenter";
import type { AccountBookInvitation } from "@/types/accountBook";
import type {
    FriendRequest,
} from "@/types/social";
import {getReceiverProfile, getRequesterProfile} from "@/components/notification/friendRequestProfile";

type InvitationFilterType = "FRIEND" | "ACCOUNT_BOOK";

type InvitationNotificationKind =
    | "FRIEND_REQUEST_RECEIVED"
    | "FRIEND_REQUEST_SENT"
    | "ACCOUNT_BOOK_INVITATION";

type UnifiedInvitationItem = {
    id: string;
    rawId: number;
    kind: InvitationNotificationKind;
    filterType: InvitationFilterType;
    title: string;
    description: string;
    actorName: string;
    actorPublicId: string;
    actorProfileImageUrl: string | null;
};

type NotificationInvitationPanelProps = {
    accountBookInvitations: AccountBookInvitation[];
    isAccountBookInvitationLoading: boolean;
    isAccountBookInvitationError: unknown;
    processingAccountBookInvitationId: number | null;
    onAcceptAccountBookInvitation: (invitationId: number) => void;
    onRejectAccountBookInvitation: (invitationId: number) => void;

    receivedFriendRequests: FriendRequest[];
    sentFriendRequests: FriendRequest[];
    isReceivedFriendRequestLoading: boolean;
    isReceivedFriendRequestError: unknown;
    isSentFriendRequestLoading: boolean;
    isSentFriendRequestError: unknown;
    processingFriendRequestId: number | null;
    processingFriendRequestAction: FriendRequestAction | null;
    onAcceptFriendRequest: (requestId: number) => void;
    onRejectFriendRequest: (requestId: number) => void;
    onCancelFriendRequest: (requestId: number) => void;
};

const DEFAULT_ACTIVE_FILTERS: Record<InvitationFilterType, boolean> = {
    FRIEND: true,
    ACCOUNT_BOOK: true,
};

export default function NotificationInvitationPanel({
    accountBookInvitations,
    isAccountBookInvitationLoading,
    isAccountBookInvitationError,
    processingAccountBookInvitationId,
    onAcceptAccountBookInvitation,
    onRejectAccountBookInvitation,

    receivedFriendRequests,
    sentFriendRequests,
    isReceivedFriendRequestLoading,
    isReceivedFriendRequestError,
    isSentFriendRequestLoading,
    isSentFriendRequestError,
    processingFriendRequestId,
    processingFriendRequestAction,
    onAcceptFriendRequest,
    onRejectFriendRequest,
    onCancelFriendRequest,
}: NotificationInvitationPanelProps) {
    const t = useTranslations("Notifications");
    const [activeFilters, setActiveFilters] = useState(
        DEFAULT_ACTIVE_FILTERS,
    );

    const items = useMemo<UnifiedInvitationItem[]>(() => {
        const receivedFriendItems = receivedFriendRequests.map((request) => {
            const requester = getRequesterProfile(request);

            return {
                id: `FRIEND_REQUEST_RECEIVED:${request.id}`,
                rawId: request.id,
                kind: "FRIEND_REQUEST_RECEIVED" as const,
                filterType: "FRIEND" as const,
                title: t("unified.friendRequestReceivedTitle"),
                description: t("unified.friendRequestReceivedDescription", {
                    requesterName: requester.nickname,
                }),
                actorName: requester.nickname,
                actorPublicId: requester.publicId,
                actorProfileImageUrl: requester.profileImageUrl,
            };
        });

        const accountBookItems = accountBookInvitations.map((invitation) => ({
            id: `ACCOUNT_BOOK_INVITATION:${invitation.id}`,
            rawId: invitation.id,
            kind: "ACCOUNT_BOOK_INVITATION" as const,
            filterType: "ACCOUNT_BOOK" as const,
            title: t("unified.accountBookInvitationTitle"),
            description: t("unified.accountBookInvitationDescription", {
                inviterName:
                    invitation.inviterUsername ||
                    invitation.inviterPublicId,
                accountBookName: invitation.accountBookName,
            }),
            actorName:
                invitation.inviterUsername || invitation.inviterPublicId,
            actorPublicId: invitation.inviterPublicId,
            actorProfileImageUrl: null,
        }));

        const sentFriendItems = sentFriendRequests.map((request) => {
            const receiver = getReceiverProfile(request);

            return {
                id: `FRIEND_REQUEST_SENT:${request.id}`,
                rawId: request.id,
                kind: "FRIEND_REQUEST_SENT" as const,
                filterType: "FRIEND" as const,
                title: t("unified.friendRequestSentTitle"),
                description: t("unified.friendRequestSentDescription", {
                    receiverName: receiver.nickname,
                }),
                actorName: receiver.nickname,
                actorPublicId: receiver.publicId,
                actorProfileImageUrl: receiver.profileImageUrl,
            };
        });

        return [
            ...receivedFriendItems,
            ...accountBookItems,
            ...sentFriendItems,
        ];
    }, [
        accountBookInvitations,
        receivedFriendRequests,
        sentFriendRequests,
        t,
    ]);

    const counts = useMemo<Record<InvitationFilterType, number>>(() => {
        return {
            FRIEND:
                receivedFriendRequests.length + sentFriendRequests.length,
            ACCOUNT_BOOK: accountBookInvitations.length,
        };
    }, [
        accountBookInvitations.length,
        receivedFriendRequests.length,
        sentFriendRequests.length,
    ]);

    const visibleItems = useMemo(() => {
        return items.filter((item) => activeFilters[item.filterType]);
    }, [activeFilters, items]);

    const hasAnyInvitation = items.length > 0;
    const isAnyLoading =
        isAccountBookInvitationLoading ||
        isReceivedFriendRequestLoading ||
        isSentFriendRequestLoading;
    const hasAnyError =
        !!isAccountBookInvitationError ||
        !!isReceivedFriendRequestError ||
        !!isSentFriendRequestError;

    const isAllFilterActive =
        activeFilters.FRIEND && activeFilters.ACCOUNT_BOOK;

    const handleToggleFilter = (filterType: InvitationFilterType) => {
        setActiveFilters((current) => ({
            ...current,
            [filterType]: !current[filterType],
        }));
    };

    const handleShowAll = () => {
        setActiveFilters(DEFAULT_ACTIVE_FILTERS);
    };

    if (isAnyLoading && !hasAnyInvitation) {
        return (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-black/20 dark:text-slate-300 dark:ring-0">
                {t("messages.loading")}
            </div>
        );
    }

    if (hasAnyError && !hasAnyInvitation) {
        return (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                {t("messages.loadFailed")}
            </div>
        );
    }

    if (!hasAnyInvitation) {
        return (
            <NotificationEmptyState
                title={t("invitation.emptyTitle")}
                description={t("invitation.emptyDescription")}
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
                <div className="mb-3">
                    <h3 className="text-sm font-black text-slate-950 dark:text-white">
                        {t("unified.title")}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {t("unified.description")}
                    </p>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                    <FilterChip
                        label={t("filters.all")}
                        count={items.length}
                        isActive={isAllFilterActive}
                        onClick={handleShowAll}
                    />
                    <FilterChip
                        label={t("filters.friend")}
                        count={counts.FRIEND}
                        isActive={activeFilters.FRIEND}
                        onClick={() => handleToggleFilter("FRIEND")}
                        icon={<UsersRound className="h-3.5 w-3.5" />}
                        activeClassName="border-orange-500 bg-orange-500 text-white"
                        inactiveClassName="border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-400/40 dark:text-orange-200 dark:hover:bg-orange-500/10"
                    />
                    <FilterChip
                        label={t("filters.accountBook")}
                        count={counts.ACCOUNT_BOOK}
                        isActive={activeFilters.ACCOUNT_BOOK}
                        onClick={() => handleToggleFilter("ACCOUNT_BOOK")}
                        icon={<BookOpen className="h-3.5 w-3.5" />}
                        activeClassName="border-emerald-500 bg-emerald-500 text-white"
                        inactiveClassName="border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-400/40 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
                    />
                </div>
            </div>

            {visibleItems.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-slate-400">
                    {t("unified.filteredEmpty")}
                </div>
            ) : (
                <div className="space-y-3">
                    {visibleItems.map((item) => (
                        <InvitationNotificationUnifiedItem
                            key={item.id}
                            item={item}
                            processingAccountBookInvitationId={
                                processingAccountBookInvitationId
                            }
                            processingFriendRequestId={
                                processingFriendRequestId
                            }
                            processingFriendRequestAction={
                                processingFriendRequestAction
                            }
                            onAcceptAccountBookInvitation={
                                onAcceptAccountBookInvitation
                            }
                            onRejectAccountBookInvitation={
                                onRejectAccountBookInvitation
                            }
                            onAcceptFriendRequest={onAcceptFriendRequest}
                            onRejectFriendRequest={onRejectFriendRequest}
                            onCancelFriendRequest={onCancelFriendRequest}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

type FilterChipProps = {
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
    activeClassName?: string;
    inactiveClassName?: string;
};

function FilterChip({
    label,
    count,
    isActive,
    onClick,
    icon,
    activeClassName = "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950",
    inactiveClassName = "border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10",
}: FilterChipProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black transition ${
                isActive ? activeClassName : inactiveClassName
            }`}
        >
            {icon}
            {label}
            <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    isActive
                        ? "bg-black/15 text-current dark:bg-white/20"
                        : "bg-slate-100 text-current dark:bg-white/10"
                }`}
            >
                {count}
            </span>
        </button>
    );
}
