"use client";

import FriendListContentSection from "@/components/friends/FriendListContentSection";
import FriendListPageModals from "@/components/friends/FriendListPageModals";
import FriendListToolbar from "@/components/friends/FriendListToolbar";
import { useFriendList } from "@/hooks/friends/useFriendList";
import { useFriendListConfirmActions } from "@/hooks/friends/useFriendListConfirmActions";
import { useFriendListPageModals } from "@/hooks/friends/useFriendListPageModals";
import { useFriendProfilePreview } from "@/hooks/friends/useFriendProfilePreview";

export default function FriendListWorkspace() {
    const friendList = useFriendList();

    const profilePreview = useFriendProfilePreview({
        isStartingChat: friendList.isStartingChat,
        startDirectChat: friendList.startDirectChat,
    });

    const modals = useFriendListPageModals();

    const confirmActions = useFriendListConfirmActions({
        confirmTarget: modals.confirmTarget,
        deletingFriendUserId:
            friendList.deletingFriendUserId,
        blockingFriendUserId:
            friendList.blockingFriendUserId,
        deleteFriend: friendList.deleteFriend,
        blockFriend: friendList.blockFriend,
        openDeleteConfirmModal:
            modals.openDeleteConfirmModal,
        openBlockConfirmModal:
            modals.openBlockConfirmModal,
        closeConfirmModal: modals.closeConfirmModal,
        clearProfilePreview:
            profilePreview.clearProfilePreview,
    });

    return (
        <>
            <div className="flex w-full flex-col gap-8">
                <FriendListToolbar
                    totalCount={
                        friendList.visibleFriends.length
                    }
                    filteredCount={
                        friendList.filteredFriends.length
                    }
                    selectedCount={
                        friendList.selectedFriendUserIds.length
                    }
                    blockedCount={
                        friendList.blockedUserIds.length
                    }
                    searchKeyword={friendList.searchKeyword}
                    isGroupSelectionMode={
                        friendList.isGroupSelectionMode
                    }
                    onSearchChange={
                        friendList.updateSearchKeyword
                    }
                    onClearSearch={
                        friendList.clearSearchKeyword
                    }
                    onOpenFriendSearch={
                        modals.openFriendSearchModal
                    }
                    onOpenBlockList={
                        modals.openBlockListModal
                    }
                    onOpenHelp={modals.openHelpModal}
                    onToggleGroupSelectionMode={
                        friendList.toggleGroupSelectionMode
                    }
                    onClearSelection={
                        friendList.clearFriendSelection
                    }
                    onGoToGroupChatCreate={
                        friendList.goToGroupChatCreate
                    }
                />

                <FriendListContentSection
                    friendList={friendList}
                    onOpenFriendSearch={
                        modals.openFriendSearchModal
                    }
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
            </div>

            <FriendListPageModals
                friendList={friendList}
                modals={modals}
                profilePreview={profilePreview}
                confirmActions={confirmActions}
            />
        </>
    );
}
