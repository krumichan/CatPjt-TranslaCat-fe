"use client";

import type React from "react";
import {
    MessageCircle,
    Send,
    ShieldAlert,
    UserCheck,
    UserMinus,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { UserSearchResult } from "@/types/social";

interface UserSearchActionPanelProps {
    result: UserSearchResult;
    isSendingRequest: boolean;
    isStartingChat: boolean;
    onSendFriendRequest: () => Promise<boolean>;
    onStartDirectChat: () => Promise<boolean>;
}

export default function UserSearchActionPanel({
    result,
    isSendingRequest,
    isStartingChat,
    onSendFriendRequest,
    onStartDirectChat,
}: UserSearchActionPanelProps) {
    const t = useTranslations("Social.userSearchPage.actions");

    if (result.friendStatus === "NONE") {
        return (
            <button
                type="button"
                onClick={onSendFriendRequest}
                disabled={isSendingRequest}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300"
            >
                <Send className="h-4 w-4" aria-hidden="true" />
                {isSendingRequest ? t("sendingRequest") : t("sendRequest")}
            </button>
        );
    }

    if (result.friendStatus === "FRIEND") {
        return (
            <button
                type="button"
                onClick={onStartDirectChat}
                disabled={isStartingChat}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {isStartingChat ? t("startingChat") : t("startChat")}
            </button>
        );
    }

    if (result.friendStatus === "REQUEST_SENT") {
        return (
            <DisabledAction
                icon={<Send className="h-4 w-4" aria-hidden="true" />}
                label={t("requestSent")}
            />
        );
    }

    if (result.friendStatus === "REQUEST_RECEIVED") {
        return (
            <DisabledAction
                icon={<UserCheck className="h-4 w-4" aria-hidden="true" />}
                label={t("requestReceived")}
            />
        );
    }

    if (result.friendStatus === "BLOCKED") {
        return (
            <DisabledAction
                icon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}
                label={t("blocked")}
                danger
            />
        );
    }

    return (
        <DisabledAction
            icon={<UserMinus className="h-4 w-4" aria-hidden="true" />}
            label={t("self")}
        />
    );
}

interface DisabledActionProps {
    icon: React.ReactNode;
    label: string;
    danger?: boolean;
}

function DisabledAction({
    icon,
    label,
    danger = false,
}: DisabledActionProps) {
    return (
        <div
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black sm:w-auto ${
                danger
                    ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                    : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
            }`}
        >
            {icon}
            {label}
        </div>
    );
}
