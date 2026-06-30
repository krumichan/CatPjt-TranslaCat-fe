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
    isBlockingUser?: boolean;
    actionErrorCode: UserSearchActionErrorCode | null;
    actionSuccessCode: UserSearchActionSuccessCode | null;
    onSendFriendRequest: () => Promise<boolean>;
    onStartDirectChat: () => Promise<boolean>;
    onBlockUser?: () => Promise<boolean>;
}

export default function UserSearchResultCard({
    result,
    isSendingRequest,
    isStartingChat,
    isBlockingUser = false,
    actionErrorCode,
    actionSuccessCode,
    onSendFriendRequest,
    onStartDirectChat,
    onBlockUser,
}: UserSearchResultCardProps) {
    const t = useTranslations("Social.userSearchPage.result");
    const tMessages = useTranslations("Social.userSearchPage.messages");

    return (
        <section className="rounded-4xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:shadow-none">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-200">
                        {result.profileImageUrl ? (
                            // TODO: 최종 오픈 전 TranslaCat 이미지 업로드 방식으로 전환 시 next/image 적용 검토
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={result.profileImageUrl}
                                alt={result.nickname}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <UserRound
                                className="h-9 w-9"
                                aria-hidden="true"
                            />
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                            {t("eyebrow")}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <h3 className="text-2xl font-black text-slate-950 dark:text-white">
                                {result.nickname}
                            </h3>
                            <UserSearchStatusBadge
                                status={result.friendStatus}
                            />
                        </div>
                        <code className="mt-2 inline-flex max-w-full rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                            <span className="truncate">
                                {result.publicId}
                            </span>
                        </code>
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {t(`statusDescriptions.${result.friendStatus}`)}
                        </p>
                    </div>
                </div>

                <UserSearchActionPanel
                    result={result}
                    isSendingRequest={isSendingRequest}
                    isStartingChat={isStartingChat}
                    isBlockingUser={isBlockingUser}
                    onSendFriendRequest={onSendFriendRequest}
                    onStartDirectChat={onStartDirectChat}
                    onBlockUser={onBlockUser}
                />
            </div>

            {actionSuccessCode === "REQUEST_SENT" && (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {tMessages("requestSent")}
                </p>
            )}

            {actionSuccessCode === "USER_BLOCKED" && (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {tMessages("userBlocked")}
                </p>
            )}

            {actionErrorCode && (
                <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                    {tMessages(`actionErrors.${actionErrorCode}`)}
                </p>
            )}
        </section>
    );
}
