"use client";

import { useCallback, useMemo, useState } from "react";

import { useRouter } from "@/navigation";
import { useQuery } from "@/hooks/useQuery";
import { friendChatService } from "@/services/chat/friendChatService";
import { friendService } from "@/services/friend/friendService";
import type { Friend } from "@/types/social";

export type FriendListActionErrorCode =
    | "LOAD_FAILED"
    | "START_CHAT_FAILED"
    | "GROUP_ENTRY_FAILED";

const GROUP_SELECTED_MEMBER_IDS_STORAGE_KEY =
    "translacat.friend-group.selected-member-user-ids";

interface UseFriendListResult {
    friends: Friend[];
    filteredFriends: Friend[];
    selectedFriendUserIds: number[];
    selectedFriends: Friend[];
    searchKeyword: string;
    isLoading: boolean;
    isStartingChat: boolean;
    startingChatFriendUserId: number | null;
    isGroupSelectionMode: boolean;
    actionErrorCode: FriendListActionErrorCode | null;
    updateSearchKeyword: (value: string) => void;
    clearSearchKeyword: () => void;
    reload: () => Promise<void>;
    startDirectChat: (friendUserId: number) => Promise<boolean>;
    toggleGroupSelectionMode: () => void;
    toggleFriendSelection: (friendUserId: number) => void;
    clearFriendSelection: () => void;
    goToGroupChatCreate: () => Promise<boolean>;
}

function filterFriends(friends: Friend[], keyword: string): Friend[] {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
        return friends;
    }

    return friends.filter((friend) => {
        return (
            friend.nickname.toLowerCase().includes(normalizedKeyword) ||
            friend.publicId.toLowerCase().includes(normalizedKeyword)
        );
    });
}

export function useFriendList(): UseFriendListResult {
    const router = useRouter();

    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedFriendUserIds, setSelectedFriendUserIds] = useState<
        number[]
    >([]);
    const [isGroupSelectionMode, setIsGroupSelectionMode] = useState(false);
    const [startingChatFriendUserId, setStartingChatFriendUserId] =
        useState<number | null>(null);
    const [actionErrorCode, setActionErrorCode] =
        useState<FriendListActionErrorCode | null>(null);

    const {
        data: friends = [],
        isLoading,
        isError,
        mutate,
    } = useQuery({
        keys: ["friends"] as const,
        fetcher: () => friendService.getFriends(),
    });

    const filteredFriends = useMemo(() => {
        return filterFriends(friends, searchKeyword);
    }, [friends, searchKeyword]);

    const selectedFriends = useMemo(() => {
        const selectedIds = new Set(selectedFriendUserIds);
        return friends.filter((friend) => selectedIds.has(friend.friendUserId));
    }, [friends, selectedFriendUserIds]);

    const updateSearchKeyword = useCallback((value: string) => {
        setSearchKeyword(value);
        setActionErrorCode(null);
    }, []);

    const clearSearchKeyword = useCallback(() => {
        setSearchKeyword("");
        setActionErrorCode(null);
    }, []);

    const reload = useCallback(async () => {
        setActionErrorCode(null);
        await mutate((currentData) => currentData, true);
    }, [mutate]);

    const startDirectChat = useCallback(
        async (friendUserId: number) => {
            if (startingChatFriendUserId !== null) {
                return false;
            }

            setStartingChatFriendUserId(friendUserId);
            setActionErrorCode(null);

            try {
                const room =
                    await friendChatService.createOrGetDirectRoom(
                        friendUserId,
                    );

                router.push(`/chat/rooms/${room.id}`);
                return true;
            } catch (error) {
                console.error("Failed to start direct chat.", error);
                setActionErrorCode("START_CHAT_FAILED");
                return false;
            } finally {
                setStartingChatFriendUserId(null);
            }
        },
        [router, startingChatFriendUserId],
    );

    const toggleGroupSelectionMode = useCallback(() => {
        setIsGroupSelectionMode((current) => !current);
        setActionErrorCode(null);
    }, []);

    const toggleFriendSelection = useCallback((friendUserId: number) => {
        setSelectedFriendUserIds((current) => {
            if (current.includes(friendUserId)) {
                return current.filter((id) => id !== friendUserId);
            }

            return [...current, friendUserId];
        });
        setActionErrorCode(null);
    }, []);

    const clearFriendSelection = useCallback(() => {
        setSelectedFriendUserIds([]);
        setActionErrorCode(null);
    }, []);

    const goToGroupChatCreate = useCallback(async () => {
        if (selectedFriendUserIds.length === 0) {
            return false;
        }

        try {
            window.sessionStorage.setItem(
                GROUP_SELECTED_MEMBER_IDS_STORAGE_KEY,
                JSON.stringify(selectedFriendUserIds),
            );
            router.push("/friends/group/new");
            return true;
        } catch (error) {
            console.error(
                "Failed to prepare selected friends for group chat.",
                error,
            );
            setActionErrorCode("GROUP_ENTRY_FAILED");
            return false;
        }
    }, [router, selectedFriendUserIds]);

    return {
        friends,
        filteredFriends,
        selectedFriendUserIds,
        selectedFriends,
        searchKeyword,
        isLoading,
        isStartingChat: startingChatFriendUserId !== null,
        startingChatFriendUserId,
        isGroupSelectionMode,
        actionErrorCode: isError ? "LOAD_FAILED" : actionErrorCode,
        updateSearchKeyword,
        clearSearchKeyword,
        reload,
        startDirectChat,
        toggleGroupSelectionMode,
        toggleFriendSelection,
        clearFriendSelection,
        goToGroupChatCreate,
    };
}

export { GROUP_SELECTED_MEMBER_IDS_STORAGE_KEY };
