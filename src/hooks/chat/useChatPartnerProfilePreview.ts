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

    const closeProfilePreview = useCallback(() => {
        setPreviewPartner(null);
    }, []);

    return {
        previewPartner,
        isProfilePreviewOpen:
            previewPartner !== null,
        openProfilePreview,
        closeProfilePreview,
    };
}
