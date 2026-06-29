import FriendListItem from "@/components/friends/FriendListItem";
import type { Friend } from "@/types/social";

type FriendListProps = {
    friends: Friend[];
    selectedFriendUserIds: number[];
    isGroupSelectionMode: boolean;
    startingChatFriendUserId: number | null;
    isStartingChat: boolean;
    onStartDirectChat: (friendUserId: number) => Promise<boolean>;
    onToggleFriendSelection: (friendUserId: number) => void;
};

export default function FriendList({
    friends,
    selectedFriendUserIds,
    isGroupSelectionMode,
    startingChatFriendUserId,
    isStartingChat,
    onStartDirectChat,
    onToggleFriendSelection,
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
                    isActionBusy={isStartingChat}
                    onStartDirectChat={onStartDirectChat}
                    onToggleFriendSelection={onToggleFriendSelection}
                />
            ))}
        </div>
    );
}
