"use client";

import { useCallback, useState } from "react";

import type { DirectPartnerProfile } from "@/types/chat";

interface UseChatPartnerProfilePreviewResult {
    previewPartner: DirectPartnerProfile | null;
    isProfilePreviewOpen: boolean;
    openProfilePreview: (
        partner: DirectPartnerProfile,
    ) => void;
    closeProfilePreview: () => void;
    applyPresence: (publicId: string, online: boolean) => void;
}

export function useChatPartnerProfilePreview(): UseChatPartnerProfilePreviewResult {
    const [previewPartner, setPreviewPartner] =
        useState<DirectPartnerProfile | null>(null);

    const openProfilePreview = useCallback(
        (partner: DirectPartnerProfile) => {
            setPreviewPartner(partner);
        },
        [],
    );

    const applyPresence = useCallback((publicId: string, online: boolean) => {
        setPreviewPartner((current) =>
            current?.publicId === publicId ? { ...current, online } : current,
        );
    }, []);

    const closeProfilePreview = useCallback(() => {
        setPreviewPartner(null);
    }, []);

    return {
        previewPartner,
        isProfilePreviewOpen:
            previewPartner !== null,
        openProfilePreview,
        closeProfilePreview,
        applyPresence,
    };
}
