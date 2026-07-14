import {
    Check,
    Loader2,
    MessageCircle,
    MoreVertical,
    ShieldAlert,
    Trash2,
    UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { KeyboardEvent, MouseEvent } from "react";

import { useFriendListItemMenu } from "@/hooks/friends/useFriendListItemMenu";
import type { Friend } from "@/types/social";

type FriendListItemProps = {
    friend: Friend;
    isSelected: boolean;
    isGroupSelectionMode: boolean;
    isStartingChat: boolean;
    isDeleting: boolean;
    isBlocking: boolean;
    isActionBusy: boolean;
    onStartDirectChat: (friendUserId: number) => Promise<boolean>;
    onToggleFriendSelection: (friendUserId: number) => void;
    onOpenProfilePreview: (friend: Friend) => void;
    onOpenDeleteConfirmModal: (friend: Friend) => void;
    onOpenBlockConfirmModal: (friend: Friend) => void;
};

export default function FriendListItem({
    friend,
    isSelected,
    isGroupSelectionMode,
    isStartingChat,
    isDeleting,
    isBlocking,
    isActionBusy,
    onStartDirectChat,
    onToggleFriendSelection,
    onOpenProfilePreview,
    onOpenDeleteConfirmModal,
    onOpenBlockConfirmModal,
}: FriendListItemProps) {
    const t = useTranslations("Social.friendListPage");

    const {
        isMenuOpen,
        menuRef,
        toggleMenu,
        stopCardClick,
        openDeleteConfirmModal,
        openBlockConfirmModal,
    } = useFriendListItemMenu({
        friend,
        onOpenDeleteConfirmModal,
        onOpenBlockConfirmModal,
    });

    const handleCardClick = () => {
        if (isActionBusy) {
            return;
        }

        if (isGroupSelectionMode) {
            onToggleFriendSelection(friend.friendUserId);
            return;
        }

        onOpenProfilePreview(friend);
    };

    const handleCardKeyDown = (
        event: KeyboardEvent<HTMLElement>,
    ) => {
        if (event.target !== event.currentTarget) {
            return;
        }

        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        event.preventDefault();
        handleCardClick();
    };

    const handleToggleFriendSelection = (
        event: MouseEvent<HTMLButtonElement>,
    ) => {
        event.stopPropagation();
        onToggleFriendSelection(friend.friendUserId);
    };

    const handleStartDirectChat = (
        event: MouseEvent<HTMLButtonElement>,
    ) => {
        event.stopPropagation();
        void onStartDirectChat(friend.friendUserId);
    };

    const isCurrentItemProcessing = isDeleting || isBlocking;
    const bio = friend.bio?.trim() || t("list.emptyBio");

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            aria-label={t("actions.openProfilePreview", {
                nickname: friend.nickname,
            })}
            className={`rounded-4xl border bg-white/90 p-4 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md focus-visible:ring-4 focus-visible:ring-orange-100 dark:bg-slate-950/70 dark:hover:border-orange-400/40 dark:focus-visible:ring-orange-500/10 ${
                isSelected
                    ? "border-orange-300 ring-4 ring-orange-100 dark:border-orange-400/70 dark:ring-orange-500/10"
                    : "border-slate-200 dark:border-white/10"
            } ${
                isActionBusy
                    ? "cursor-default"
                    : "cursor-pointer"
            }`}
        >
            <div className="flex items-start gap-4">
                {isGroupSelectionMode && (
                    <button
                        type="button"
                        onClick={handleToggleFriendSelection}
                        aria-label={
                            isSelected
                                ? t("actions.unselectFriend", {
                                      nickname: friend.nickname,
                                  })
                                : t("actions.selectFriend", {
                                      nickname: friend.nickname,
                                  })
                        }
                        disabled={isActionBusy}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            isSelected
                                ? "border-orange-500 bg-orange-500 text-white"
                                : "border-slate-200 bg-white text-slate-400 hover:border-orange-300 hover:text-orange-500 dark:border-white/10 dark:bg-slate-950 dark:hover:border-orange-400"
                        }`}
                    >
                        {isSelected ? (
                            <Check
                                className="h-4 w-4"
                                aria-hidden="true"
                            />
                        ) : (
                            "+"
                        )}
                    </button>
                )}

                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-200">
                    {friend.profileImageUrl ? (
                        // TODO: TranslaCat 이미지 업로드 방식 전환 시 next/image 적용 검토
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={friend.profileImageUrl}
                            alt={friend.nickname}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <UserRound
                            className="h-7 w-7"
                            aria-hidden="true"
                        />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="truncate text-base font-black text-slate-900 dark:text-white">
                                {friend.nickname}
                            </h3>

                            <code className="mt-1 block truncate text-xs font-bold text-slate-400">
                                {friend.publicId}
                            </code>
                        </div>

                        <div
                            ref={menuRef}
                            className="relative shrink-0"
                            onMouseDown={stopCardClick}
                            onClick={stopCardClick}
                        >
                            <button
                                type="button"
                                onClick={toggleMenu}
                                aria-label={t("actions.more")}
                                disabled={isActionBusy}
                                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-white/15 dark:hover:text-white"
                            >
                                {isCurrentItemProcessing ? (
                                    <Loader2
                                        className="h-4 w-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <MoreVertical
                                        className="h-5 w-5"
                                        aria-hidden="true"
                                    />
                                )}
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 top-12 z-10 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-slate-950">
                                    <button
                                        type="button"
                                        onClick={openDeleteConfirmModal}
                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                                    >
                                        <Trash2
                                            className="h-4 w-4"
                                            aria-hidden="true"
                                        />
                                        {t("actions.deleteFriend")}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={openBlockConfirmModal}
                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-rose-500 transition hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-rose-500/10"
                                    >
                                        <ShieldAlert
                                            className="h-4 w-4"
                                            aria-hidden="true"
                                        />
                                        {t("actions.blockFriend")}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-500 dark:text-slate-300">
                        {bio}
                    </p>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-400">
                            {t("list.friendSince", {
                                date: friend.friendSince,
                            })}
                        </p>

                        {!isGroupSelectionMode && (
                            <button
                                type="button"
                                onClick={handleStartDirectChat}
                                disabled={isActionBusy}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                            >
                                {isStartingChat ? (
                                    <Loader2
                                        className="h-4 w-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <MessageCircle
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                )}

                                {isStartingChat
                                    ? t("actions.startingChat")
                                    : t("actions.startChat")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}
