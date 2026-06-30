"use client";

import FriendListItem from "@/components/friends/FriendListItem";
import type { Friend } from "@/types/social";

type FriendListProps = {
    friends: Friend[];
    selectedFriendUserIds: number[];
    isGroupSelectionMode: boolean;
    startingChatFriendUserId: number | null;
    deletingFriendUserId: number | null;
    isStartingChat: boolean;
    onStartDirectChat: (friendUserId: number) => Promise<boolean>;
    onToggleFriendSelection: (friendUserId: number) => void;
    onOpenDeleteConfirmModal: (friend: Friend) => void;
};

export default function FriendList({
    friends,
    selectedFriendUserIds,
    isGroupSelectionMode,
    startingChatFriendUserId,
    deletingFriendUserId,
    isStartingChat,
    onStartDirectChat,
    onToggleFriendSelection,
    onOpenDeleteConfirmModal,
}: FriendListProps) {
    return (
        <div className="grid gap-3">
            {friends.map((friend) => (
                <FriendListItem
                    key={friend.friendUserId}
                    friend={friend}
                    isSelected={selectedFriendUserIds.includes(
                        friend.friendUserId,
                    )}
                    isGroupSelectionMode={isGroupSelectionMode}
                    isStartingChat={
                        startingChatFriendUserId === friend.friendUserId
                    }
                    isDeleting={
                        deletingFriendUserId === friend.friendUserId
                    }
                    isActionBusy={
                        isStartingChat || deletingFriendUserId !== null
                    }
                    onStartDirectChat={onStartDirectChat}
                    onToggleFriendSelection={onToggleFriendSelection}
                    onOpenDeleteConfirmModal={onOpenDeleteConfirmModal}
                />
            ))}
        </div>
    );
}
