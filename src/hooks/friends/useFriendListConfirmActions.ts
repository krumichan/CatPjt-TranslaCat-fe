"use client";

import { useCallback } from "react";

import type { FriendConfirmTarget } from "@/hooks/friends/useFriendListPageModals";
import type { Friend } from "@/types/social";

interface UseFriendListConfirmActionsParams {
    confirmTarget: FriendConfirmTarget;
    deletingFriendUserId: number | null;
    blockingFriendUserId: number | null;
    deleteFriend: (friendUserId: number) => Promise<boolean>;
    blockFriend: (friend: Friend) => Promise<boolean>;
    openDeleteConfirmModal: (friend: Friend) => void;
    openBlockConfirmModal: (friend: Friend) => void;
    closeConfirmModal: () => void;
    clearProfilePreview: () => void;
}

export function useFriendListConfirmActions({
    confirmTarget,
    deletingFriendUserId,
    blockingFriendUserId,
    deleteFriend,
    blockFriend,
    openDeleteConfirmModal,
    openBlockConfirmModal,
    closeConfirmModal,
    clearProfilePreview,
}: UseFriendListConfirmActionsParams) {
    const isConfirmProcessing =
        deletingFriendUserId !== null ||
        blockingFriendUserId !== null;

    const handleOpenDeleteConfirmModal = useCallback(
        (friend: Friend) => {
            clearProfilePreview();
            openDeleteConfirmModal(friend);
        },
        [clearProfilePreview, openDeleteConfirmModal],
    );

    const handleOpenBlockConfirmModal = useCallback(
        (friend: Friend) => {
            clearProfilePreview();
            openBlockConfirmModal(friend);
        },
        [clearProfilePreview, openBlockConfirmModal],
    );

    const handleCloseConfirmModal = useCallback(() => {
        if (isConfirmProcessing) {
            return;
        }

        closeConfirmModal();
    }, [closeConfirmModal, isConfirmProcessing]);

    const handleConfirmAction = useCallback(async () => {
        if (!confirmTarget) {
            return;
        }

        if (confirmTarget.type === "DELETE") {
            const isDeleted = await deleteFriend(
                confirmTarget.friend.friendUserId,
            );

            if (isDeleted) {
                closeConfirmModal();
            }

            return;
        }

        const isBlocked = await blockFriend(confirmTarget.friend);

        if (isBlocked) {
            closeConfirmModal();
        }
    }, [
        blockFriend,
        closeConfirmModal,
        confirmTarget,
        deleteFriend,
    ]);

    return {
        isConfirmProcessing,
        handleOpenDeleteConfirmModal,
        handleOpenBlockConfirmModal,
        handleCloseConfirmModal,
        handleConfirmAction,
    };
}
