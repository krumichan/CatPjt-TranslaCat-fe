import React from "react";
import {
    BookOpen,
    Bot,
    Languages,
    MessageCircle,
    Mic,
    Settings,
    ShieldCheck,
    WalletCards,
} from "lucide-react";

export type SettingCard = {
    href: string;
    titleKey: string;
    descriptionKey: string;
    statusKey: string;
    icon: React.ElementType;
    adminOnly?: boolean;
    enabled?: boolean;
};

export const settingCards: SettingCard[] = [
    {
        href: "/settings/general",
        titleKey: "general.title",
        descriptionKey: "general.description",
        statusKey: "status.preparing",
        icon: Settings,
        enabled: false,
    },
    {
        href: "/settings/voice-translation",
        titleKey: "voiceTranslation.title",
        descriptionKey: "voiceTranslation.description",
        statusKey: "status.preparing",
        icon: Mic,
        enabled: false,
    },
    {
        href: "/settings/novel",
        titleKey: "novel.title",
        descriptionKey: "novel.description",
        statusKey: "status.preparing",
        icon: BookOpen,
        enabled: false,
    },
    {
        href: "/settings/chat",
        titleKey: "chat.title",
        descriptionKey: "chat.description",
        statusKey: "status.preparing",
        icon: MessageCircle,
        enabled: false,
    },
    {
        href: "/settings/account-book",
        titleKey: "accountBook.title",
        descriptionKey: "accountBook.description",
        statusKey: "status.preparing",
        icon: WalletCards,
        enabled: false,
    },
    {
        href: "/settings/admin/currencies",
        titleKey: "currency.title",
        descriptionKey: "currency.description",
        statusKey: "status.available",
        icon: Languages,
        adminOnly: true,
        enabled: true,
    },
    {
        href: "/settings/admin",
        titleKey: "admin.title",
        descriptionKey: "admin.description",
        statusKey: "status.preparing",
        icon: ShieldCheck,
        adminOnly: true,
        enabled: false,
    },
    {
        href: "/settings/ai-voice",
        titleKey: "aiVoice.title",
        descriptionKey: "aiVoice.description",
        statusKey: "status.future",
        icon: Bot,
        enabled: false,
    },
];