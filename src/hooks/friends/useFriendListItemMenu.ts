"use client";

import {
    type MouseEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import type { Friend } from "@/types/social";

interface UseFriendListItemMenuParams {
    friend: Friend;
    onOpenDeleteConfirmModal: (friend: Friend) => void;
    onOpenBlockConfirmModal: (friend: Friend) => void;
}

export function useFriendListItemMenu({
    friend,
    onOpenDeleteConfirmModal,
    onOpenBlockConfirmModal,
}: UseFriendListItemMenuParams) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleMouseDown = (event: globalThis.MouseEvent) => {
            if (!menuRef.current) {
                return;
            }

            if (!menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, []);

    const stopCardClick = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            event.stopPropagation();
        },
        [],
    );

    const toggleMenu = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            setIsMenuOpen((current) => !current);
        },
        [],
    );

    const openDeleteConfirmModal = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            setIsMenuOpen(false);
            onOpenDeleteConfirmModal(friend);
        },
        [friend, onOpenDeleteConfirmModal],
    );

    const openBlockConfirmModal = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            setIsMenuOpen(false);
            onOpenBlockConfirmModal(friend);
        },
        [friend, onOpenBlockConfirmModal],
    );

    return {
        isMenuOpen,
        menuRef,
        toggleMenu,
        stopCardClick,
        openDeleteConfirmModal,
        openBlockConfirmModal,
    };
}
