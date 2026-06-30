"use client";

import { useCallback, useMemo, useState } from "react";

import { useRouter } from "@/navigation";
import { useQuery } from "@/hooks/useQuery";
import { friendChatService } from "@/services/chat/friendChatService";
import { friendService } from "@/services/friend/friendService";
import { userBlockService } from "@/services/block/userBlockService";
import type { Friend, UserBlock } from "@/types/social";

export type FriendListActionErrorCode =
    | "LOAD_FAILED"
    | "START_CHAT_FAILED"
    | "GROUP_ENTRY_FAILED"
    | "DELETE_FRIEND_FAILED"
    | "BLOCK_FRIEND_FAILED"
    | "UNBLOCK_FRIEND_FAILED"
    | "BLOCKED_USER_ACTION_DENIED";

const GROUP_SELECTED_MEMBER_IDS_STORAGE_KEY =
    "translacat.friend-group.selected-member-user-ids";

interface UseFriendListResult {
    friends: Friend[];
    visibleFriends: Friend[];
    filteredFriends: Friend[];
    selectedFriendUserIds: number[];
    selectedFriends: Friend[];
    blockedUsers: UserBlock[];
    blockedUserIds: number[];
    searchKeyword: string;
    isLoading: boolean;
    isBlockLoading: boolean;
    isStartingChat: boolean;
    startingChatFriendUserId: number | null;
    isGroupSelectionMode: boolean;
    deletingFriendUserId: number | null;
    blockingFriendUserId: number | null;
    unblockingFriendUserId: number | null;
    actionErrorCode: FriendListActionErrorCode | null;
    isBlockedFriend: (friendUserId: number) => boolean;
    updateSearchKeyword: (value: string) => void;
    clearSearchKeyword: () => void;
    reload: () => Promise<void>;
    startDirectChat: (friendUserId: number) => Promise<boolean>;
    deleteFriend: (friendUserId: number) => Promise<boolean>;
    blockFriend: (friend: Friend) => Promise<boolean>;
    unblockFriend: (friendUserId: number) => Promise<boolean>;
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
    const [deletingFriendUserId, setDeletingFriendUserId] =
        useState<number | null>(null);
    const [blockingFriendUserId, setBlockingFriendUserId] =
        useState<number | null>(null);
    const [unblockingFriendUserId, setUnblockingFriendUserId] =
        useState<number | null>(null);
    const [actionErrorCode, setActionErrorCode] =
        useState<FriendListActionErrorCode | null>(null);

    const {
        data: friends = [],
        isLoading,
        isError,
        mutate: mutateFriends,
    } = useQuery({
        keys: ["friends"] as const,
        fetcher: () => friendService.getFriends(),
    });

    const {
        data: blocks = [],
        isLoading: isBlockLoading,
        isError: isBlockError,
        mutate: mutateBlocks,
    } = useQuery({
        keys: ["blocks"] as const,
        fetcher: () => userBlockService.getBlocks(),
    });

    const blockedUserIdSet = useMemo(() => {
        return new Set(blocks.map((block) => block.blockedUserId));
    }, [blocks]);

    const blockedUserIds = useMemo(() => {
        return Array.from(blockedUserIdSet);
    }, [blockedUserIdSet]);

    const visibleFriends = useMemo(() => {
        return friends.filter(
            (friend) => !blockedUserIdSet.has(friend.friendUserId),
        );
    }, [blockedUserIdSet, friends]);

    const filteredFriends = useMemo(() => {
        return filterFriends(visibleFriends, searchKeyword);
    }, [visibleFriends, searchKeyword]);

    const selectedFriends = useMemo(() => {
        const selectedIds = new Set(selectedFriendUserIds);
        return visibleFriends.filter((friend) =>
            selectedIds.has(friend.friendUserId),
        );
    }, [visibleFriends, selectedFriendUserIds]);

    const isBlockedFriend = useCallback(
        (friendUserId: number) => blockedUserIdSet.has(friendUserId),
        [blockedUserIdSet],
    );

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
        await Promise.all([
            mutateFriends((currentData) => currentData, true),
            mutateBlocks((currentData) => currentData, true),
        ]);
    }, [mutateBlocks, mutateFriends]);

    const startDirectChat = useCallback(
        async (friendUserId: number) => {
            if (
                startingChatFriendUserId !== null ||
                deletingFriendUserId !== null ||
                blockingFriendUserId !== null ||
                unblockingFriendUserId !== null
            ) {
                return false;
            }

            if (blockedUserIdSet.has(friendUserId)) {
                setActionErrorCode("BLOCKED_USER_ACTION_DENIED");
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
        [
            blockedUserIdSet,
            blockingFriendUserId,
            deletingFriendUserId,
            router,
            startingChatFriendUserId,
            unblockingFriendUserId,
        ],
    );

    const deleteFriend = useCallback(
        async (friendUserId: number) => {
            if (
                deletingFriendUserId !== null ||
                startingChatFriendUserId !== null ||
                blockingFriendUserId !== null ||
                unblockingFriendUserId !== null
            ) {
                return false;
            }

            setDeletingFriendUserId(friendUserId);
            setActionErrorCode(null);

            try {
                await friendService.deleteFriend(friendUserId);

                await mutateFriends((currentData) => {
                    if (!currentData) {
                        return currentData;
                    }

                    return currentData.filter(
                        (friend: Friend) =>
                            friend.friendUserId !== friendUserId,
                    );
                }, false);

                setSelectedFriendUserIds((current) =>
                    current.filter((id) => id !== friendUserId),
                );

                await mutateFriends((currentData) => currentData, true);

                return true;
            } catch (error) {
                console.error("Failed to delete friend.", error);
                setActionErrorCode("DELETE_FRIEND_FAILED");
                return false;
            } finally {
                setDeletingFriendUserId(null);
            }
        },
        [
            blockingFriendUserId,
            deletingFriendUserId,
            mutateFriends,
            startingChatFriendUserId,
            unblockingFriendUserId,
        ],
    );

    const blockFriend = useCallback(
        async (friend: Friend) => {
            if (
                blockingFriendUserId !== null ||
                unblockingFriendUserId !== null ||
                deletingFriendUserId !== null ||
                startingChatFriendUserId !== null
            ) {
                return false;
            }

            setBlockingFriendUserId(friend.friendUserId);
            setActionErrorCode(null);

            try {
                const block = await userBlockService.blockUser({
                    blockedPublicId: friend.publicId,
                });

                await mutateBlocks((currentData) => {
                    const currentBlocks = currentData ?? [];
                    const exists = currentBlocks.some(
                        (currentBlock: UserBlock) =>
                            currentBlock.blockedUserId ===
                            block.blockedUserId,
                    );

                    return exists ? currentBlocks : [...currentBlocks, block];
                }, false);

                setSelectedFriendUserIds((current) =>
                    current.filter((id) => id !== friend.friendUserId),
                );

                await mutateBlocks((currentData) => currentData, true);

                return true;
            } catch (error) {
                console.error("Failed to block friend.", error);
                setActionErrorCode("BLOCK_FRIEND_FAILED");
                return false;
            } finally {
                setBlockingFriendUserId(null);
            }
        },
        [
            blockingFriendUserId,
            deletingFriendUserId,
            mutateBlocks,
            startingChatFriendUserId,
            unblockingFriendUserId,
        ],
    );

    const unblockFriend = useCallback(
        async (friendUserId: number) => {
            if (
                blockingFriendUserId !== null ||
                unblockingFriendUserId !== null ||
                deletingFriendUserId !== null ||
                startingChatFriendUserId !== null
            ) {
                return false;
            }

            setUnblockingFriendUserId(friendUserId);
            setActionErrorCode(null);

            try {
                await userBlockService.unblockUser(friendUserId);

                await mutateBlocks((currentData) => {
                    if (!currentData) {
                        return currentData;
                    }

                    return currentData.filter(
                        (block: UserBlock) =>
                            block.blockedUserId !== friendUserId,
                    );
                }, false);

                await mutateBlocks((currentData) => currentData, true);

                return true;
            } catch (error) {
                console.error("Failed to unblock friend.", error);
                setActionErrorCode("UNBLOCK_FRIEND_FAILED");
                return false;
            } finally {
                setUnblockingFriendUserId(null);
            }
        },
        [
            blockingFriendUserId,
            deletingFriendUserId,
            mutateBlocks,
            startingChatFriendUserId,
            unblockingFriendUserId,
        ],
    );

    const toggleGroupSelectionMode = useCallback(() => {
        setIsGroupSelectionMode((current) => !current);
        setActionErrorCode(null);
    }, []);

    const toggleFriendSelection = useCallback(
        (friendUserId: number) => {
            if (blockedUserIdSet.has(friendUserId)) {
                setActionErrorCode("BLOCKED_USER_ACTION_DENIED");
                return;
            }

            setSelectedFriendUserIds((current) => {
                if (current.includes(friendUserId)) {
                    return current.filter((id) => id !== friendUserId);
                }

                return [...current, friendUserId];
            });
            setActionErrorCode(null);
        },
        [blockedUserIdSet],
    );

    const clearFriendSelection = useCallback(() => {
        setSelectedFriendUserIds([]);
        setActionErrorCode(null);
    }, []);

    const goToGroupChatCreate = useCallback(async () => {
        const availableSelectedFriendUserIds = selectedFriendUserIds.filter(
            (friendUserId) => !blockedUserIdSet.has(friendUserId),
        );

        if (availableSelectedFriendUserIds.length === 0) {
            return false;
        }

        try {
            window.sessionStorage.setItem(
                GROUP_SELECTED_MEMBER_IDS_STORAGE_KEY,
                JSON.stringify(availableSelectedFriendUserIds),
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
    }, [blockedUserIdSet, router, selectedFriendUserIds]);

    return {
        friends,
        visibleFriends,
        filteredFriends,
        selectedFriendUserIds,
        selectedFriends,
        blockedUsers: blocks,
        blockedUserIds,
        searchKeyword,
        isLoading,
        isBlockLoading,
        isStartingChat: startingChatFriendUserId !== null,
        startingChatFriendUserId,
        isGroupSelectionMode,
        deletingFriendUserId,
        blockingFriendUserId,
        unblockingFriendUserId,
        actionErrorCode:
            isError || isBlockError ? "LOAD_FAILED" : actionErrorCode,
        isBlockedFriend,
        updateSearchKeyword,
        clearSearchKeyword,
        reload,
        startDirectChat,
        deleteFriend,
        blockFriend,
        unblockFriend,
        toggleGroupSelectionMode,
        toggleFriendSelection,
        clearFriendSelection,
        goToGroupChatCreate,
    };
}

export { GROUP_SELECTED_MEMBER_IDS_STORAGE_KEY };
