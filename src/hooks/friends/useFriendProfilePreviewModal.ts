"use client";

import { useEffect } from "react";

interface UseFriendProfilePreviewModalParams {
    isOpen: boolean;
    isProcessing: boolean;
    onClose: () => void;
}

export function useFriendProfilePreviewModal({
    isOpen,
    isProcessing,
    onClose,
}: UseFriendProfilePreviewModalParams) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isProcessing) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, isProcessing, onClose]);
}
