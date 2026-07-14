"use client";

import { useCallback, useState } from "react";

import type { Friend } from "@/types/social";

export type FriendConfirmTargetType = "DELETE" | "BLOCK";

export type FriendConfirmTarget = {
    type: FriendConfirmTargetType;
    friend: Friend;
} | null;

export function useFriendListPageModals() {
    const [isFriendSearchModalOpen, setIsFriendSearchModalOpen] =
        useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isBlockListModalOpen, setIsBlockListModalOpen] =
        useState(false);
    const [confirmTarget, setConfirmTarget] =
        useState<FriendConfirmTarget>(null);

    const openFriendSearchModal = useCallback(() => {
        setIsFriendSearchModalOpen(true);
    }, []);

    const closeFriendSearchModal = useCallback(() => {
        setIsFriendSearchModalOpen(false);
    }, []);

    const openHelpModal = useCallback(() => {
        setIsHelpModalOpen(true);
    }, []);

    const closeHelpModal = useCallback(() => {
        setIsHelpModalOpen(false);
    }, []);

    const openBlockListModal = useCallback(() => {
        setIsBlockListModalOpen(true);
    }, []);

    const closeBlockListModal = useCallback(() => {
        setIsBlockListModalOpen(false);
    }, []);

    const openDeleteConfirmModal = useCallback((friend: Friend) => {
        setConfirmTarget({
            type: "DELETE",
            friend,
        });
    }, []);

    const openBlockConfirmModal = useCallback((friend: Friend) => {
        setConfirmTarget({
            type: "BLOCK",
            friend,
        });
    }, []);

    const closeConfirmModal = useCallback(() => {
        setConfirmTarget(null);
    }, []);

    return {
        isFriendSearchModalOpen,
        isHelpModalOpen,
        isBlockListModalOpen,
        confirmTarget,
        openFriendSearchModal,
        closeFriendSearchModal,
        openHelpModal,
        closeHelpModal,
        openBlockListModal,
        closeBlockListModal,
        openDeleteConfirmModal,
        openBlockConfirmModal,
        closeConfirmModal,
    };
}
