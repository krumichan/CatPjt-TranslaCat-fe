"use client";

import { BookOpen, Check, Send, UserRound, UsersRound, X } from "lucide-react";
import { useTranslations } from "next-intl";

import type { FriendRequestAction } from "@/components/notification/useNotificationCenter";

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

type InvitationNotificationUnifiedItemProps = {
    item: UnifiedInvitationItem;
    processingAccountBookInvitationId: number | null;
    processingFriendRequestId: number | null;
    processingFriendRequestAction: FriendRequestAction | null;
    onAcceptAccountBookInvitation: (invitationId: number) => void;
    onRejectAccountBookInvitation: (invitationId: number) => void;
    onAcceptFriendRequest: (requestId: number) => void;
    onRejectFriendRequest: (requestId: number) => void;
    onCancelFriendRequest: (requestId: number) => void;
};

function getTypeConfig(item: UnifiedInvitationItem) {
    if (item.filterType === "ACCOUNT_BOOK") {
        return {
            icon: BookOpen,
            labelKey: "type.accountBook",
            chipClassName:
                "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200",
            avatarClassName:
                "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200",
        };
    }

    if (item.kind === "FRIEND_REQUEST_SENT") {
        return {
            icon: Send,
            labelKey: "type.friendSent",
            chipClassName:
                "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200",
            avatarClassName:
                "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-200",
        };
    }

    return {
        icon: UsersRound,
        labelKey: "type.friend",
        chipClassName:
            "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200",
        avatarClassName:
            "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-200",
    };
}

export default function InvitationNotificationUnifiedItem({
    item,
    processingAccountBookInvitationId,
    processingFriendRequestId,
    processingFriendRequestAction,
    onAcceptAccountBookInvitation,
    onRejectAccountBookInvitation,
    onAcceptFriendRequest,
    onRejectFriendRequest,
    onCancelFriendRequest,
}: InvitationNotificationUnifiedItemProps) {
    const t = useTranslations("Notifications");
    const config = getTypeConfig(item);
    const TypeIcon = config.icon;

    const isAccountBookProcessing =
        item.kind === "ACCOUNT_BOOK_INVITATION" &&
        processingAccountBookInvitationId === item.rawId;
    const isFriendProcessing =
        item.filterType === "FRIEND" &&
        processingFriendRequestId === item.rawId;
    const isProcessing = isAccountBookProcessing || isFriendProcessing;
    const isBusy =
        item.kind === "ACCOUNT_BOOK_INVITATION"
            ? processingAccountBookInvitationId !== null
            : processingFriendRequestId !== null;

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/70 dark:shadow-none">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                    <div
                        className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${config.avatarClassName}`}
                    >
                        {item.actorProfileImageUrl ? (
                            // TODO: TranslaCat 이미지 업로드 방식 전환 시 next/image 적용 검토
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={item.actorProfileImageUrl}
                                alt={item.actorName}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <UserRound
                                className="h-6 w-6"
                                aria-hidden="true"
                            />
                        )}

                        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-slate-100 text-slate-500 dark:border-slate-950 dark:bg-slate-900 dark:text-slate-300">
                            <TypeIcon
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                            />
                        </span>
                    </div>

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-black ${config.chipClassName}`}
                            >
                                {t(config.labelKey)}
                            </span>
                            <p className="text-sm font-black text-slate-950 dark:text-white">
                                {item.title}
                            </p>
                        </div>

                        <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                            {item.description}
                        </p>

                        <code className="mt-2 inline-flex max-w-full rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                            <span className="truncate">
                                {item.actorPublicId}
                            </span>
                        </code>
                    </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    {item.kind === "FRIEND_REQUEST_RECEIVED" && (
                        <>
                            <button
                                type="button"
                                onClick={() =>
                                    onRejectFriendRequest(item.rawId)
                                }
                                disabled={isBusy}
                                className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                                {isProcessing &&
                                processingFriendRequestAction === "REJECT"
                                    ? t("actions.processing")
                                    : t("actions.reject")}
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    onAcceptFriendRequest(item.rawId)
                                }
                                disabled={isBusy}
                                className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                            >
                                <Check
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                                {isProcessing &&
                                processingFriendRequestAction === "ACCEPT"
                                    ? t("actions.processing")
                                    : t("actions.accept")}
                            </button>
                        </>
                    )}

                    {item.kind === "FRIEND_REQUEST_SENT" && (
                        <button
                            type="button"
                            onClick={() =>
                                onCancelFriendRequest(item.rawId)
                            }
                            disabled={isBusy}
                            className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                            {isProcessing &&
                            processingFriendRequestAction === "CANCEL"
                                ? t("actions.processing")
                                : t("actions.cancel")}
                        </button>
                    )}

                    {item.kind === "ACCOUNT_BOOK_INVITATION" && (
                        <>
                            <button
                                type="button"
                                onClick={() =>
                                    onRejectAccountBookInvitation(item.rawId)
                                }
                                disabled={isBusy}
                                className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                                {isProcessing
                                    ? t("actions.processing")
                                    : t("actions.reject")}
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    onAcceptAccountBookInvitation(item.rawId)
                                }
                                disabled={isBusy}
                                className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                            >
                                <Check
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                                {isProcessing
                                    ? t("actions.processing")
                                    : t("actions.accept")}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </article>
    );
}
