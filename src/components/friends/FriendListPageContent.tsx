"use client";

import { useState } from "react";

import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import ConfirmModal from "@/components/common/ConfirmModal";
import FeedbackMessage from "@/components/common/FeedbackMessage";
import BlockListModal from "@/components/friends/BlockListModal";
import FriendHelpModal from "@/components/friends/FriendHelpModal";
import FriendList from "@/components/friends/FriendList";
import FriendListEmptyState from "@/components/friends/FriendListEmptyState";
import FriendListStatePanel from "@/components/friends/FriendListStatePanel";
import FriendListToolbar from "@/components/friends/FriendListToolbar";
import FriendSearchModal from "@/components/friends/FriendSearchModal";
import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";
import { FRIEND_LIST_ACTION_ERROR_MESSAGE_KEYS } from "@/constants/friends/friendListMessage";
import { useFriendList } from "@/hooks/friends/useFriendList";
import type { Friend } from "@/types/social";

type ConfirmTargetType = "DELETE" | "BLOCK";

type ConfirmTarget = {
    type: ConfirmTargetType;
    friend: Friend;
} | null;

export default function FriendListPageContent() {
    const t = useTranslations("Social.friendListPage");
    const tDeleteModal = useTranslations("Social.friendListPage.deleteModal");
    const tBlockModal = useTranslations("Social.friendListPage.blockModal");

    const friendList = useFriendList();

    const [isFriendSearchModalOpen, setIsFriendSearchModalOpen] =
        useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isBlockListModalOpen, setIsBlockListModalOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);

    const hasFriends = friendList.visibleFriends.length > 0;
    const hasFilteredFriends = friendList.filteredFriends.length > 0;
    const actionErrorMessageKey =
        friendList.actionErrorCode && friendList.actionErrorCode !== "LOAD_FAILED"
            ? FRIEND_LIST_ACTION_ERROR_MESSAGE_KEYS[friendList.actionErrorCode]
            : null;

    const openFriendSearchModal = () => {
        setIsFriendSearchModalOpen(true);
    };

    const closeFriendSearchModal = () => {
        setIsFriendSearchModalOpen(false);
    };

    const isConfirmProcessing =
        friendList.deletingFriendUserId !== null ||
        friendList.blockingFriendUserId !== null;

    const closeConfirmModal = () => {
        if (isConfirmProcessing) {
            return;
        }

        setConfirmTarget(null);
    };

    const handleConfirmAction = async () => {
        if (!confirmTarget) {
            return;
        }

        if (confirmTarget.type === "DELETE") {
            const isDeleted = await friendList.deleteFriend(
                confirmTarget.friend.friendUserId,
            );

            if (isDeleted) {
                setConfirmTarget(null);
            }

            return;
        }

        const isBlocked = await friendList.blockFriend(confirmTarget.friend);

        if (isBlocked) {
            setConfirmTarget(null);
        }
    };

    const confirmModalCopy = getConfirmModalCopy(
        confirmTarget?.type,
        tDeleteModal,
        tBlockModal,
    );

    return (
        <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 pt-24 sm:px-6 lg:px-8">
            <SettingsSubPageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                description={t("description")}
            />

            <section className="rounded-4xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:shadow-none">
                <FriendListToolbar
                    totalCount={friendList.visibleFriends.length}
                    filteredCount={friendList.filteredFriends.length}
                    selectedCount={friendList.selectedFriendUserIds.length}
                    blockedCount={friendList.blockedUsers.length}
                    searchKeyword={friendList.searchKeyword}
                    isGroupSelectionMode={friendList.isGroupSelectionMode}
                    onSearchChange={friendList.updateSearchKeyword}
                    onClearSearch={friendList.clearSearchKeyword}
                    onOpenFriendSearch={openFriendSearchModal}
                    onOpenBlockList={() => setIsBlockListModalOpen(true)}
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
                            description={t("state.filteredEmptyDescription")}
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
                            blockingFriendUserId={
                                friendList.blockingFriendUserId
                            }
                            isStartingChat={friendList.isStartingChat}
                            onStartDirectChat={friendList.startDirectChat}
                            onToggleFriendSelection={
                                friendList.toggleFriendSelection
                            }
                            onOpenDeleteConfirmModal={(friend) =>
                                setConfirmTarget({
                                    type: "DELETE",
                                    friend,
                                })
                            }
                            onOpenBlockConfirmModal={(friend) =>
                                setConfirmTarget({
                                    type: "BLOCK",
                                    friend,
                                })
                            }
                        />
                    )}

                    {actionErrorMessageKey && (
                        <FeedbackMessage variant="error" className="mt-4">
                            {t(actionErrorMessageKey)}
                        </FeedbackMessage>
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

            <BlockListModal
                isOpen={isBlockListModalOpen}
                blocks={friendList.blockedUsers}
                isLoading={friendList.isBlockLoading}
                unblockingUserId={friendList.unblockingFriendUserId}
                onClose={() => setIsBlockListModalOpen(false)}
                onUnblock={friendList.unblockFriend}
            />

            <ConfirmModal
                isOpen={confirmTarget !== null}
                title={confirmModalCopy.title}
                description={
                    confirmTarget
                        ? confirmModalCopy.description(
                              confirmTarget.friend.nickname,
                          )
                        : undefined
                }
                helpMessage={confirmModalCopy.help}
                helpButtonLabel={confirmModalCopy.helpButton}
                confirmLabel={confirmModalCopy.confirm}
                cancelLabel={confirmModalCopy.cancel}
                variant="danger"
                isLoading={isConfirmProcessing}
                onClose={closeConfirmModal}
                onConfirm={handleConfirmAction}
            >
                {confirmTarget && (
                    <FriendSummaryForConfirm friend={confirmTarget.friend} />
                )}
            </ConfirmModal>
        </main>
    );
}

function FriendSummaryForConfirm({ friend }: { friend: Friend }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
            <div className="flex items-center gap-3">
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
                        <UserRound className="h-7 w-7" aria-hidden="true" />
                    )}
                </div>

                <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-950 dark:text-white">
                        {friend.nickname}
                    </p>
                    <code className="mt-1 inline-flex max-w-full rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-white/10">
                        <span className="truncate">{friend.publicId}</span>
                    </code>
                </div>
            </div>
        </div>
    );
}

function getConfirmModalCopy(
    type: ConfirmTargetType | undefined,
    tDeleteModal: ReturnType<typeof useTranslations>,
    tBlockModal: ReturnType<typeof useTranslations>,
) {
    if (type === "BLOCK") {
        return {
            title: tBlockModal("title"),
            description: (nickname: string) =>
                tBlockModal("description", { nickname }),
            help: tBlockModal("help"),
            helpButton: tBlockModal("helpButton"),
            confirm: tBlockModal("confirm"),
            cancel: tBlockModal("cancel"),
        };
    }

    return {
        title: tDeleteModal("title"),
        description: (nickname: string) =>
            tDeleteModal("description", { nickname }),
        help: tDeleteModal("help"),
        helpButton: tDeleteModal("helpButton"),
        confirm: tDeleteModal("confirm"),
        cancel: tDeleteModal("cancel"),
    };
}
