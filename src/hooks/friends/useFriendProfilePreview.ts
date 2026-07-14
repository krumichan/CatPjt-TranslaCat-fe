"use client";

import { useCallback, useState } from "react";

import type { Friend } from "@/types/social";

interface UseFriendProfilePreviewParams {
    isStartingChat: boolean;
    startDirectChat: (friendUserId: number) => Promise<boolean>;
}

interface UseFriendProfilePreviewResult {
    previewFriend: Friend | null;
    isProfilePreviewOpen: boolean;
    openProfilePreview: (friend: Friend) => void;
    closeProfilePreview: () => void;
    clearProfilePreview: () => void;
    startDirectChatFromPreview: () => Promise<boolean>;
}

export function useFriendProfilePreview({
    isStartingChat,
    startDirectChat,
}: UseFriendProfilePreviewParams): UseFriendProfilePreviewResult {
    const [previewFriend, setPreviewFriend] =
        useState<Friend | null>(null);

    const openProfilePreview = useCallback((friend: Friend) => {
        setPreviewFriend(friend);
    }, []);

    const closeProfilePreview = useCallback(() => {
        if (isStartingChat) {
            return;
        }

        setPreviewFriend(null);
    }, [isStartingChat]);

    const clearProfilePreview = useCallback(() => {
        setPreviewFriend(null);
    }, []);

    const startDirectChatFromPreview = useCallback(async () => {
        if (!previewFriend) {
            return false;
        }

        return startDirectChat(previewFriend.friendUserId);
    }, [previewFriend, startDirectChat]);

    return {
        previewFriend,
        isProfilePreviewOpen: previewFriend !== null,
        openProfilePreview,
        closeProfilePreview,
        clearProfilePreview,
        startDirectChatFromPreview,
    };
}
