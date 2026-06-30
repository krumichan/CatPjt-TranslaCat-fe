"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import ConfirmModal from "@/components/common/ConfirmModal";
import FriendHelpModal from "@/components/friends/FriendHelpModal";
import FriendList from "@/components/friends/FriendList";
import FriendListEmptyState from "@/components/friends/FriendListEmptyState";
import FriendListStatePanel from "@/components/friends/FriendListStatePanel";
import FriendListToolbar from "@/components/friends/FriendListToolbar";
import FriendSearchModal from "@/components/friends/FriendSearchModal";
import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";
import { useFriendList } from "@/hooks/friends/useFriendList";
import type { Friend } from "@/types/social";

export default function FriendListPageContent() {
    const t = useTranslations("Social.friendListPage");
    const tDeleteModal = useTranslations("Social.friendListPage.deleteModal");
    const friendList = useFriendList();

    const [isFriendSearchModalOpen, setIsFriendSearchModalOpen] =
        useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [deleteTargetFriend, setDeleteTargetFriend] =
        useState<Friend | null>(null);

    const hasFriends = friendList.friends.length > 0;
    const hasFilteredFriends = friendList.filteredFriends.length > 0;

    const openFriendSearchModal = () => {
        setIsFriendSearchModalOpen(true);
    };

    const closeFriendSearchModal = () => {
        setIsFriendSearchModalOpen(false);
    };

    const openDeleteConfirmModal = (friend: Friend) => {
        setDeleteTargetFriend(friend);
    };

    const closeDeleteConfirmModal = () => {
        if (friendList.deletingFriendUserId !== null) {
            return;
        }

        setDeleteTargetFriend(null);
    };

    const handleConfirmDeleteFriend = async () => {
        if (!deleteTargetFriend) {
            return;
        }

        const isDeleted = await friendList.deleteFriend(
            deleteTargetFriend.friendUserId,
        );

        if (isDeleted) {
            setDeleteTargetFriend(null);
        }
    };

    return (
        <main className="mx-auto pt-24 max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
            <SettingsSubPageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                description={t("description")}
            />

            <section className="rounded-4xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:shadow-none">
                <FriendListToolbar
                    totalCount={friendList.friends.length}
                    filteredCount={friendList.filteredFriends.length}
                    selectedCount={friendList.selectedFriendUserIds.length}
                    searchKeyword={friendList.searchKeyword}
                    isGroupSelectionMode={friendList.isGroupSelectionMode}
                    onSearchChange={friendList.updateSearchKeyword}
                    onClearSearch={friendList.clearSearchKeyword}
                    onOpenFriendSearch={openFriendSearchModal}
                    onOpenHelp={() => setIsHelpModalOpen(true)}
                    onToggleGroupSelectionMode={
                        friendList.toggleGroupSelectionMode
                    }
                    onClearSelection={friendList.clearFriendSelection}
                    onGoToGroupChatCreate={friendList.goToGroupChatCreate}
                />

                <div className="mt-5">
                    {friendList.isLoading ? (
                        <FriendListStatePanel
                            variant="loading"
                            title={t("state.loadingTitle")}
                            description={t("state.loadingDescription")}
                        />
                    ) : friendList.actionErrorCode === "LOAD_FAILED" ? (
                        <FriendListStatePanel
                            variant="error"
                            title={t("state.loadFailedTitle")}
                            description={t("state.loadFailedDescription")}
                            actionLabel={t("actions.reload")}
                            onAction={friendList.reload}
                        />
                    ) : !hasFriends ? (
                        <FriendListEmptyState
                            onOpenFriendSearch={openFriendSearchModal}
                        />
                    ) : !hasFilteredFriends ? (
                        <FriendListStatePanel
                            variant="empty"
                            title={t("state.filteredEmptyTitle")}
                            description={t(
                                "state.filteredEmptyDescription",
                            )}
                            actionLabel={t("actions.clearSearch")}
                            onAction={friendList.clearSearchKeyword}
                        />
                    ) : (
                        <FriendList
                            friends={friendList.filteredFriends}
                            selectedFriendUserIds={
                                friendList.selectedFriendUserIds
                            }
                            isGroupSelectionMode={
                                friendList.isGroupSelectionMode
                            }
                            startingChatFriendUserId={
                                friendList.startingChatFriendUserId
                            }
                            deletingFriendUserId={
                                friendList.deletingFriendUserId
                            }
                            isStartingChat={friendList.isStartingChat}
                            onStartDirectChat={friendList.startDirectChat}
                            onToggleFriendSelection={
                                friendList.toggleFriendSelection
                            }
                            onOpenDeleteConfirmModal={
                                openDeleteConfirmModal
                            }
                        />
                    )}

                    {friendList.actionErrorCode ===
                        "START_CHAT_FAILED" && (
                        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                            {t("messages.startChatFailed")}
                        </p>
                    )}

                    {friendList.actionErrorCode ===
                        "GROUP_ENTRY_FAILED" && (
                        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                            {t("messages.groupEntryFailed")}
                        </p>
                    )}

                    {friendList.actionErrorCode ===
                        "DELETE_FRIEND_FAILED" && (
                        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                            {t("messages.deleteFriendFailed")}
                        </p>
                    )}
                </div>
            </section>

            <FriendSearchModal
                isOpen={isFriendSearchModalOpen}
                onClose={closeFriendSearchModal}
            />

            <FriendHelpModal
                isOpen={isHelpModalOpen}
                variant="friendList"
                onClose={() => setIsHelpModalOpen(false)}
            />

            <ConfirmModal
                isOpen={deleteTargetFriend !== null}
                title={tDeleteModal("title")}
                description={
                    deleteTargetFriend
                        ? tDeleteModal("description", {
                              nickname: deleteTargetFriend.nickname,
                          })
                        : undefined
                }
                helpMessage={tDeleteModal("help")}
                helpButtonLabel={tDeleteModal("helpButton")}
                confirmLabel={tDeleteModal("confirm")}
                cancelLabel={tDeleteModal("cancel")}
                variant="danger"
                isLoading={
                    deleteTargetFriend
                        ? friendList.deletingFriendUserId ===
                          deleteTargetFriend.friendUserId
                        : false
                }
                onClose={closeDeleteConfirmModal}
                onConfirm={handleConfirmDeleteFriend}
            >
                {deleteTargetFriend && (
                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                        <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-200">
                                {deleteTargetFriend.profileImageUrl ? (
                                    // TODO: TranslaCat 이미지 업로드 방식 전환 시 next/image 적용 검토
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={deleteTargetFriend.profileImageUrl}
                                        alt={deleteTargetFriend.nickname}
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
                                <p className="truncate text-base font-black text-slate-950 dark:text-white">
                                    {deleteTargetFriend.nickname}
                                </p>
                                <code className="mt-1 inline-flex max-w-full rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-white/10">
                                    <span className="truncate">
                                        {deleteTargetFriend.publicId}
                                    </span>
                                </code>
                            </div>
                        </div>
                    </div>
                )}
            </ConfirmModal>
        </main>
    );
}
