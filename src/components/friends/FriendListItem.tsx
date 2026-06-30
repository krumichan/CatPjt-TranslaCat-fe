"use client";

import {
    Check,
    Loader2,
    MessageCircle,
    MoreVertical,
    Trash2,
    UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { Friend } from "@/types/social";

type FriendListItemProps = {
    friend: Friend;
    isSelected: boolean;
    isGroupSelectionMode: boolean;
    isStartingChat: boolean;
    isDeleting: boolean;
    isActionBusy: boolean;
    onStartDirectChat: (friendUserId: number) => Promise<boolean>;
    onToggleFriendSelection: (friendUserId: number) => void;
    onOpenDeleteConfirmModal: (friend: Friend) => void;
};

export default function FriendListItem({
    friend,
    isSelected,
    isGroupSelectionMode,
    isStartingChat,
    isDeleting,
    isActionBusy,
    onStartDirectChat,
    onToggleFriendSelection,
    onOpenDeleteConfirmModal,
}: FriendListItemProps) {
    const t = useTranslations("Social.friendListPage");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            if (!menuRef.current) {
                return;
            }

            if (!menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, []);

    const handleOpenDeleteConfirmModal = () => {
        setIsMenuOpen(false);
        onOpenDeleteConfirmModal(friend);
    };

    return (
        <article
            className={`rounded-3xl border p-4 transition ${
                isSelected
                    ? "border-orange-300 bg-orange-50 dark:border-orange-400/40 dark:bg-orange-500/10"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            }`}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    {isGroupSelectionMode && (
                        <button
                            type="button"
                            onClick={() =>
                                onToggleFriendSelection(friend.friendUserId)
                            }
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
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                />
                            ) : (
                                <span aria-hidden="true">+</span>
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

                    <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-slate-950 dark:text-white">
                            {friend.nickname}
                        </h3>
                        <code className="mt-1 inline-flex max-w-full rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-white/10">
                            <span className="truncate">
                                {friend.publicId}
                            </span>
                        </code>
                        <p className="mt-1 text-xs text-slate-400">
                            {t("list.friendSince", {
                                date: friend.friendSince,
                            })}
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onStartDirectChat(friend.friendUserId)}
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

                    <div ref={menuRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setIsMenuOpen((current) => !current)}
                            aria-label={t("actions.more")}
                            disabled={isActionBusy}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-white/15 dark:hover:text-white"
                        >
                            {isDeleting ? (
                                <Loader2
                                    className="h-5 w-5 animate-spin"
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
                            <div className="absolute right-0 top-12 z-10 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-900">
                                <button
                                    type="button"
                                    onClick={handleOpenDeleteConfirmModal}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-rose-500/10"
                                >
                                    <Trash2
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    {t("actions.deleteFriend")}
                                </button>
                                <button
                                    type="button"
                                    disabled
                                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-400 disabled:cursor-not-allowed dark:text-slate-500"
                                >
                                    {t("actions.blockFriendFuture")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}
