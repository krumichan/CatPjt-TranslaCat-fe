"use client";

import { UserSearchBlockButton } from "@/components/user-search/UserSearchBlockButton";
import { UserSearchDisabledAction } from "@/components/user-search/UserSearchDisabledAction";
import type { UserSearchResult } from "@/types/social";
import { Ban, MessageCircle, Send, UserCheck, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";

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
                    <UserSearchBlockButton
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
                    <UserSearchBlockButton
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
                <UserSearchDisabledAction
                    icon={<UserCheck className="h-4 w-4" />}
                    label={t("requestSent")}
                />
                {canBlock && (
                    <UserSearchBlockButton
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
                <UserSearchDisabledAction
                    icon={<UserMinus className="h-4 w-4" />}
                    label={t("requestReceived")}
                />
                {canBlock && (
                    <UserSearchBlockButton
                        isBlocking={isBlockingUser}
                        onBlockUser={onBlockUser}
                    />
                )}
            </div>
        );
    }

    if (result.friendStatus === "BLOCKED") {
        return (
            <UserSearchDisabledAction
                icon={<Ban className="h-4 w-4" />}
                label={t("blocked")}
                danger
            />
        );
    }

    return (
        <UserSearchDisabledAction
            icon={<UserCheck className="h-4 w-4" />}
            label={t("self")}
        />
    );
}
