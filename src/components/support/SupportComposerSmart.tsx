"use client";

import { useTranslations } from "next-intl";

import { SupportComposerView } from "@/components/support/SupportComposerView";
import { useSupportComposer } from "@/hooks/support/useSupportComposer";
import type { SupportController } from "@/hooks/support/useSupportController";

export function SupportComposerSmart({ controller }: { controller: SupportController }) {
    const t = useTranslations("Support");
    const { detail, isEditing, relatedMessage } = controller;
    const composer = useSupportComposer({
        title: isEditing && detail ? detail.title : relatedMessage ? t("messages.relatedTitle", { title: relatedMessage.title }).slice(0, 200) : "",
        content: isEditing && detail ? detail.content : "",
        category: "GENERAL",
        noticeType: isEditing && detail && "noticeType" in detail ? detail.noticeType : "NORMAL",
        recipient: null,
        relatedMessageId: relatedMessage?.id,
    });

    return <SupportComposerView controller={controller} composer={composer} />;
}
