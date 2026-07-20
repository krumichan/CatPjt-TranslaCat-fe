"use client";

import { useTranslations } from "next-intl";

import UserProfilePreviewModal from "@/components/profile/UserProfilePreviewModal";
import type { DirectPartnerProfile } from "@/types/chat";

interface ChatPartnerProfilePreviewModalProps {
    isOpen: boolean;
    partner: DirectPartnerProfile | null;
    onClose: () => void;
}

export function ChatPartnerProfilePreviewModal({
    isOpen,
    partner,
    onClose,
}: ChatPartnerProfilePreviewModalProps) {
    const t = useTranslations("ChatRoom.profilePreview");

    return (
        <UserProfilePreviewModal
            isOpen={isOpen}
            profile={partner}
            titleId="chat-partner-profile-preview-title"
            closeLabel={t("close")}
            profileAlt={
                partner
                    ? t("profileAlt", {
                          nickname: partner.displayName,
                      })
                    : ""
            }
            bioLabel={t("bio")}
            emptyBioText={t("emptyBio")}
            onClose={onClose}
        />
    );
}
