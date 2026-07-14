import FriendListItem from "@/components/friends/FriendListItem";
import type { Friend } from "@/types/social";

type FriendListProps = {
    friends: Friend[];
    selectedFriendUserIds: number[];
    isGroupSelectionMode: boolean;
    startingChatFriendUserId: number | null;
    deletingFriendUserId: number | null;
    blockingFriendUserId: number | null;
    isStartingChat: boolean;
    onStartDirectChat: (friendUserId: number) => Promise<boolean>;
    onToggleFriendSelection: (friendUserId: number) => void;
    onOpenProfilePreview: (friend: Friend) => void;
    onOpenDeleteConfirmModal: (friend: Friend) => void;
    onOpenBlockConfirmModal: (friend: Friend) => void;
};

export default function FriendList({
    friends,
    selectedFriendUserIds,
    isGroupSelectionMode,
    startingChatFriendUserId,
    deletingFriendUserId,
    blockingFriendUserId,
    isStartingChat,
    onStartDirectChat,
    onToggleFriendSelection,
    onOpenProfilePreview,
    onOpenDeleteConfirmModal,
    onOpenBlockConfirmModal,
}: FriendListProps) {
    return (
        <div className="space-y-3">
            {friends.map((friend) => (
                <FriendListItem
                    key={friend.friendUserId}
                    friend={friend}
                    isSelected={selectedFriendUserIds.includes(
                        friend.friendUserId,
                    )}
                    isGroupSelectionMode={isGroupSelectionMode}
                    isStartingChat={
                        isStartingChat &&
                        startingChatFriendUserId ===
                            friend.friendUserId
                    }
                    isDeleting={
                        deletingFriendUserId === friend.friendUserId
                    }
                    isBlocking={
                        blockingFriendUserId === friend.friendUserId
                    }
                    isActionBusy={
                        deletingFriendUserId !== null ||
                        blockingFriendUserId !== null ||
                        startingChatFriendUserId !== null
                    }
                    onStartDirectChat={onStartDirectChat}
                    onToggleFriendSelection={
                        onToggleFriendSelection
                    }
                    onOpenProfilePreview={onOpenProfilePreview}
                    onOpenDeleteConfirmModal={
                        onOpenDeleteConfirmModal
                    }
                    onOpenBlockConfirmModal={
                        onOpenBlockConfirmModal
                    }
                />
            ))}
        </div>
    );
}
