"use client";

import { useTranslations } from "next-intl";

import FriendListContentSection from "@/components/friends/FriendListContentSection";
import FriendListPageModals from "@/components/friends/FriendListPageModals";
import FriendListToolbar from "@/components/friends/FriendListToolbar";
import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";
import { useFriendList } from "@/hooks/friends/useFriendList";
import { useFriendListConfirmActions } from "@/hooks/friends/useFriendListConfirmActions";
import { useFriendListPageModals } from "@/hooks/friends/useFriendListPageModals";
import { useFriendProfilePreview } from "@/hooks/friends/useFriendProfilePreview";

export default function FriendListPageContent() {
    const t = useTranslations("Social.friendListPage");

    const friendList = useFriendList();

    const profilePreview = useFriendProfilePreview({
        isStartingChat: friendList.isStartingChat,
        startDirectChat: friendList.startDirectChat,
    });

    const modals = useFriendListPageModals();

    const confirmActions = useFriendListConfirmActions({
        confirmTarget: modals.confirmTarget,
        deletingFriendUserId: friendList.deletingFriendUserId,
        blockingFriendUserId: friendList.blockingFriendUserId,
        deleteFriend: friendList.deleteFriend,
        blockFriend: friendList.blockFriend,
        openDeleteConfirmModal: modals.openDeleteConfirmModal,
        openBlockConfirmModal: modals.openBlockConfirmModal,
        closeConfirmModal: modals.closeConfirmModal,
        clearProfilePreview: profilePreview.clearProfilePreview,
    });

    return (
        <>
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 pt-20 sm:px-6 lg:px-8">
                <SettingsSubPageHeader
                    eyebrow={t("eyebrow")}
                    title={t("title")}
                    description={t("description")}
                />

                <FriendListToolbar
                    totalCount={friendList.visibleFriends.length}
                    filteredCount={friendList.filteredFriends.length}
                    selectedCount={friendList.selectedFriendUserIds.length}
                    blockedCount={friendList.blockedUserIds.length}
                    searchKeyword={friendList.searchKeyword}
                    isGroupSelectionMode={friendList.isGroupSelectionMode}
                    onSearchChange={friendList.updateSearchKeyword}
                    onClearSearch={friendList.clearSearchKeyword}
                    onOpenFriendSearch={modals.openFriendSearchModal}
                    onOpenBlockList={modals.openBlockListModal}
                    onOpenHelp={modals.openHelpModal}
                    onToggleGroupSelectionMode={
                        friendList.toggleGroupSelectionMode
                    }
                    onClearSelection={friendList.clearFriendSelection}
                    onGoToGroupChatCreate={friendList.goToGroupChatCreate}
                />

                <FriendListContentSection
                    friendList={friendList}
                    onOpenFriendSearch={modals.openFriendSearchModal}
                    onOpenProfilePreview={
                        profilePreview.openProfilePreview
                    }
                    onOpenDeleteConfirmModal={
                        confirmActions.handleOpenDeleteConfirmModal
                    }
                    onOpenBlockConfirmModal={
                        confirmActions.handleOpenBlockConfirmModal
                    }
                />
            </main>

            <FriendListPageModals
                friendList={friendList}
                modals={modals}
                profilePreview={profilePreview}
                confirmActions={confirmActions}
            />
        </>
    );
}
