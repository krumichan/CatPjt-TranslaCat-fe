"use client";

import { useCallback, useEffect, useState } from "react";

import type { FriendGroupChatCreateErrorCode } from "@/constants/friends/friendGroupChatCreate";
import { useRouter } from "@/navigation";
import { friendChatService } from "@/services/chat/friendChatService";
import { friendService } from "@/services/friend/friendService";
import { userBlockService } from "@/services/block/userBlockService";
import type { Friend } from "@/types/social";

export const GROUP_SELECTED_MEMBER_IDS_STORAGE_KEY =
    "translacat.friend-group.selected-member-user-ids";

interface UseFriendGroupChatCreateResult {
    name: string;
    description: string;
    selectedFriends: Friend[];
    isLoading: boolean;
    isCreating: boolean;
    errorCode: FriendGroupChatCreateErrorCode | null;
    updateName: (value: string) => void;
    updateDescription: (value: string) => void;
    removeFriend: (friendUserId: number) => void;
    reload: () => Promise<void>;
    createGroup: () => Promise<boolean>;
    backToFriendList: () => void;
}

function parseSelectedFriendUserIds(value: string | null): number[] {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value) as unknown;

        if (!Array.isArray(parsed)) {
            return [];
        }

        return Array.from(
            new Set(
                parsed.filter(
                    (item): item is number =>
                        typeof item === "number" &&
                        Number.isInteger(item) &&
                        item > 0,
                ),
            ),
        );
    } catch {
        return [];
    }
}

export function useFriendGroupChatCreate(): UseFriendGroupChatCreateResult {
    const router = useRouter();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [errorCode, setErrorCode] =
        useState<FriendGroupChatCreateErrorCode | null>(null);

    const loadSelectedFriends = useCallback(async () => {
        setIsLoading(true);
        setErrorCode(null);

        const selectedFriendUserIds = parseSelectedFriendUserIds(
            window.sessionStorage.getItem(
                GROUP_SELECTED_MEMBER_IDS_STORAGE_KEY,
            ),
        );

        if (selectedFriendUserIds.length === 0) {
            setSelectedFriends([]);
            setErrorCode("SELECTION_REQUIRED");
            setIsLoading(false);
            return;
        }

        try {
            const [friends, blocks] = await Promise.all([
                friendService.getFriends(),
                userBlockService.getBlocks(),
            ]);

            const selectedIdSet = new Set(selectedFriendUserIds);
            const blockedIdSet = new Set(
                blocks.map((block) => block.blockedUserId),
            );

            const validSelectedFriends = friends.filter(
                (friend) =>
                    selectedIdSet.has(friend.friendUserId) &&
                    !blockedIdSet.has(friend.friendUserId),
            );

            setSelectedFriends(validSelectedFriends);

            const validIdSet = new Set(
                validSelectedFriends.map((friend) => friend.friendUserId),
            );
            const selectionWasAdjusted = selectedFriendUserIds.some(
                (friendUserId) => !validIdSet.has(friendUserId),
            );

            if (validSelectedFriends.length === 0) {
                setErrorCode("SELECTION_REQUIRED");
                return;
            }

            window.sessionStorage.setItem(
                GROUP_SELECTED_MEMBER_IDS_STORAGE_KEY,
                JSON.stringify(
                    validSelectedFriends.map(
                        (friend) => friend.friendUserId,
                    ),
                ),
            );

            setErrorCode(
                selectionWasAdjusted ? "SELECTION_ADJUSTED" : null,
            );
        } catch (error) {
            console.error(
                "Failed to load selected friends for group chat.",
                error,
            );
            setSelectedFriends([]);
            setErrorCode("LOAD_FAILED");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSelectedFriends();
    }, [loadSelectedFriends]);

    const updateName = useCallback((value: string) => {
        setName(value);
        setErrorCode((current) =>
            current === "NAME_REQUIRED" || current === "CREATE_FAILED"
                ? null
                : current,
        );
    }, []);

    const updateDescription = useCallback((value: string) => {
        setDescription(value);
        setErrorCode((current) =>
            current === "CREATE_FAILED" ? null : current,
        );
    }, []);

    const removeFriend = useCallback(
        (friendUserId: number) => {
            if (isCreating) {
                return;
            }

            setSelectedFriends((current) => {
                const next = current.filter(
                    (friend) => friend.friendUserId !== friendUserId,
                );

                window.sessionStorage.setItem(
                    GROUP_SELECTED_MEMBER_IDS_STORAGE_KEY,
                    JSON.stringify(
                        next.map((friend) => friend.friendUserId),
                    ),
                );

                if (next.length === 0) {
                    setErrorCode("SELECTION_REQUIRED");
                } else {
                    setErrorCode((currentError) =>
                        currentError === "SELECTION_REQUIRED" ||
                        currentError === "SELECTION_ADJUSTED"
                            ? null
                            : currentError,
                    );
                }

                return next;
            });
        },
        [isCreating],
    );

    const createGroup = useCallback(async () => {
        if (isCreating) {
            return false;
        }

        const trimmedName = name.trim();
        const trimmedDescription = description.trim();

        if (!trimmedName) {
            setErrorCode("NAME_REQUIRED");
            return false;
        }

        if (selectedFriends.length === 0) {
            setErrorCode("SELECTION_REQUIRED");
            return false;
        }

        setIsCreating(true);
        setErrorCode(null);

        try {
            const room = await friendChatService.createGroupRoom({
                name: trimmedName,
                description: trimmedDescription || undefined,
                memberUserIds: selectedFriends.map(
                    (friend) => friend.friendUserId,
                ),
            });

            window.sessionStorage.removeItem(
                GROUP_SELECTED_MEMBER_IDS_STORAGE_KEY,
            );
            router.replace(`/chat/rooms/${room.id}`);
            return true;
        } catch (error) {
            console.error("Failed to create friend group chat room.", error);
            setErrorCode("CREATE_FAILED");
            return false;
        } finally {
            setIsCreating(false);
        }
    }, [description, isCreating, name, router, selectedFriends]);

    const backToFriendList = useCallback(() => {
        router.push("/friends");
    }, [router]);

    return {
        name,
        description,
        selectedFriends,
        isLoading,
        isCreating,
        errorCode,
        updateName,
        updateDescription,
        removeFriend,
        reload: loadSelectedFriends,
        createGroup,
        backToFriendList,
    };
}
