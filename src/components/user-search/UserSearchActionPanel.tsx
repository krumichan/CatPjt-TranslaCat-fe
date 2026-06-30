"use client";

import type React from "react";
import {
    Ban,
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
    isBlockingUser?: boolean;
    onSendFriendRequest: () => Promise<boolean>;
    onStartDirectChat: () => Promise<boolean>;
    onBlockUser?: () => Promise<boolean>;
}

export default function UserSearchActionPanel({
    result,
    isSendingRequest,
    isStartingChat,
    isBlockingUser = false,
    onSendFriendRequest,
    onStartDirectChat,
    onBlockUser,
}: UserSearchActionPanelProps) {
    const t = useTranslations("Social.userSearchPage.actions");
    const canBlock =
        result.friendStatus !== "SELF" &&
        result.friendStatus !== "BLOCKED" &&
        !!onBlockUser;

    if (result.friendStatus === "NONE") {
        return (
            <div className="flex shrink-0 flex-col gap-2">
                <button
                    type="button"
                    onClick={onSendFriendRequest}
                    disabled={isSendingRequest || isBlockingUser}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {isSendingRequest
                        ? t("sendingRequest")
                        : t("sendRequest")}
                </button>
                {canBlock && (
                    <BlockButton
                        isBlocking={isBlockingUser}
                        onBlockUser={onBlockUser}
                    />
                )}
            </div>
        );
    }

    if (result.friendStatus === "FRIEND") {
        return (
            <div className="flex shrink-0 flex-col gap-2">
                <button
                    type="button"
                    onClick={onStartDirectChat}
                    disabled={isStartingChat || isBlockingUser}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                >
                    <MessageCircle
                        className="h-4 w-4"
                        aria-hidden="true"
                    />
                    {isStartingChat ? t("startingChat") : t("startChat")}
                </button>
                {canBlock && (
                    <BlockButton
                        isBlocking={isBlockingUser}
                        onBlockUser={onBlockUser}
                    />
                )}
            </div>
        );
    }

    if (result.friendStatus === "REQUEST_SENT") {
        return (
            <div className="flex shrink-0 flex-col gap-2">
                <DisabledAction
                    icon={<UserCheck className="h-4 w-4" />}
                    label={t("requestSent")}
                />
                {canBlock && (
                    <BlockButton
                        isBlocking={isBlockingUser}
                        onBlockUser={onBlockUser}
                    />
                )}
            </div>
        );
    }

    if (result.friendStatus === "REQUEST_RECEIVED") {
        return (
            <div className="flex shrink-0 flex-col gap-2">
                <DisabledAction
                    icon={<UserMinus className="h-4 w-4" />}
                    label={t("requestReceived")}
                />
                {canBlock && (
                    <BlockButton
                        isBlocking={isBlockingUser}
                        onBlockUser={onBlockUser}
                    />
                )}
            </div>
        );
    }

    if (result.friendStatus === "BLOCKED") {
        return (
            <DisabledAction
                icon={<Ban className="h-4 w-4" />}
                label={t("blocked")}
                danger
            />
        );
    }

    return (
        <DisabledAction
            icon={<UserCheck className="h-4 w-4" />}
            label={t("self")}
        />
    );
}

function BlockButton({
    isBlocking,
    onBlockUser,
}: {
    isBlocking: boolean;
    onBlockUser: () => Promise<boolean>;
}) {
    const t = useTranslations("Social.userSearchPage.actions");

    return (
        <button
            type="button"
            onClick={onBlockUser}
            disabled={isBlocking}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
        >
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            {isBlocking ? t("blocking") : t("block")}
        </button>
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
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black ${
                danger
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200"
                    : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
            }`}
        >
            {icon}
            {label}
        </div>
    );
}
