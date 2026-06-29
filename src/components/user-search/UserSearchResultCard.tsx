"use client";

import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import UserSearchActionPanel from "@/components/user-search/UserSearchActionPanel";
import UserSearchStatusBadge from "@/components/user-search/UserSearchStatusBadge";
import type {
    UserSearchActionErrorCode,
    UserSearchActionSuccessCode,
} from "@/hooks/user-search/usePublicIdUserSearch";
import type { UserSearchResult } from "@/types/social";

interface UserSearchResultCardProps {
    result: UserSearchResult;
    isSendingRequest: boolean;
    isStartingChat: boolean;
    actionErrorCode: UserSearchActionErrorCode | null;
    actionSuccessCode: UserSearchActionSuccessCode | null;
    onSendFriendRequest: () => Promise<boolean>;
    onStartDirectChat: () => Promise<boolean>;
}

export default function UserSearchResultCard({
    result,
    isSendingRequest,
    isStartingChat,
    actionErrorCode,
    actionSuccessCode,
    onSendFriendRequest,
    onStartDirectChat,
}: UserSearchResultCardProps) {
    const t = useTranslations("Social.userSearchPage.result");
    const tMessages = useTranslations("Social.userSearchPage.messages");

    return (
        <article className="rounded-4xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-orange-200 bg-orange-50 text-orange-500 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200">
                    {result.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={result.profileImageUrl}
                            alt={result.nickname}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <UserRound className="h-9 w-9" aria-hidden="true" />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
                                {t("eyebrow")}
                            </p>
                            <h3 className="mt-2 truncate text-2xl font-black text-slate-900 dark:text-white">
                                {result.nickname}
                            </h3>
                            <code className="mt-2 inline-flex max-w-full rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10">
                                <span className="truncate">
                                    {result.publicId}
                                </span>
                            </code>
                        </div>

                        <UserSearchStatusBadge status={result.friendStatus} />
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-300">
                        {t(`statusDescriptions.${result.friendStatus}`)}
                    </p>
                </div>
            </div>

            <div className="mt-5">
                <UserSearchActionPanel
                    result={result}
                    isSendingRequest={isSendingRequest}
                    isStartingChat={isStartingChat}
                    onSendFriendRequest={onSendFriendRequest}
                    onStartDirectChat={onStartDirectChat}
                />
            </div>

            {actionSuccessCode === "REQUEST_SENT" && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {tMessages("requestSent")}
                </div>
            )}

            {actionErrorCode === "SEND_REQUEST_FAILED" && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                    {tMessages("sendRequestFailed")}
                </div>
            )}

            {actionErrorCode === "START_CHAT_FAILED" && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                    {tMessages("startChatFailed")}
                </div>
            )}
        </article>
    );
}
