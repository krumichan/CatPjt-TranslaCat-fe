import { useTranslations } from "next-intl";

import FeedbackMessage from "@/components/common/FeedbackMessage";
import FriendList from "@/components/friends/FriendList";
import FriendListEmptyState from "@/components/friends/FriendListEmptyState";
import FriendListStatePanel from "@/components/friends/FriendListStatePanel";
import { FRIEND_LIST_ACTION_ERROR_MESSAGE_KEYS } from "@/constants/friends/friendListMessage";
import { useFriendList } from "@/hooks/friends/useFriendList";
import type { Friend } from "@/types/social";

type FriendListContentSectionProps = {
    friendList: ReturnType<typeof useFriendList>;
    onOpenFriendSearch: () => void;
    onOpenProfilePreview: (friend: Friend) => void;
    onOpenDeleteConfirmModal: (friend: Friend) => void;
    onOpenBlockConfirmModal: (friend: Friend) => void;
};

export default function FriendListContentSection({
    friendList,
    onOpenFriendSearch,
    onOpenProfilePreview,
    onOpenDeleteConfirmModal,
    onOpenBlockConfirmModal,
}: FriendListContentSectionProps) {
    const t = useTranslations("Social.friendListPage");

    const hasFriends = friendList.visibleFriends.length > 0;
    const hasFilteredFriends = friendList.filteredFriends.length > 0;

    const actionErrorMessageKey =
        friendList.actionErrorCode &&
        friendList.actionErrorCode !== "LOAD_FAILED"
            ? FRIEND_LIST_ACTION_ERROR_MESSAGE_KEYS[
                friendList.actionErrorCode
                ]
            : null;

    return (
        <>
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
                    onOpenFriendSearch={onOpenFriendSearch}
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
                    onOpenProfilePreview={onOpenProfilePreview}
                    onOpenDeleteConfirmModal={
                        onOpenDeleteConfirmModal
                    }
                    onOpenBlockConfirmModal={
                        onOpenBlockConfirmModal
                    }
                />
            )}

            {actionErrorMessageKey && (
                <FeedbackMessage variant="error">
                    {t(actionErrorMessageKey)}
                </FeedbackMessage>
            )}
        </>
    );
}