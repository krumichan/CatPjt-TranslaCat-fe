"use client";

import {
    AlertCircle,
    CalendarDays,
    Loader2,
    RefreshCw,
    UserRoundX,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { OpenChatRoleBadge } from "@/components/chat/open-moderation/OpenChatRoleBadge";
import { OpenChatAvatar } from "@/components/chat/open-profile/OpenChatAvatar";
import type {
    OpenChatBlacklistErrorCode,
} from "@/hooks/chat/useOpenChatBlacklist";
import type { OpenChatBanListItem } from "@/types/chat";

interface OpenChatBlacklistContentProps {
    items: OpenChatBanListItem[];
    appliedKeyword: string | null;
    isLoading: boolean;
    isLoadingMore: boolean;
    hasNext: boolean;
    loadErrorCode: OpenChatBlacklistErrorCode | null;
    formatDate: (value: string) => string;
    onRetry: () => void;
    onLoadMore: () => void;
    onOpenRelease: (item: OpenChatBanListItem) => void;
}

export function OpenChatBlacklistContent({
    items,
    appliedKeyword,
    isLoading,
    isLoadingMore,
    hasNext,
    loadErrorCode,
    formatDate,
    onRetry,
    onLoadMore,
    onOpenRelease,
}: OpenChatBlacklistContentProps) {
    const t = useTranslations("OpenChatBlacklist");

    if (isLoading) {
        return (
            <div className="mt-5 flex min-h-64 items-center justify-center rounded-[2rem] border border-slate-200 bg-white text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <Loader2
                    className="mr-2 h-5 w-5 animate-spin"
                    aria-hidden="true"
                />
                {t("loading")}
            </div>
        );
    }

    if (loadErrorCode) {
        return (
            <section className="mt-5 rounded-[2rem] border border-rose-200 bg-white p-8 text-center dark:border-rose-400/30 dark:bg-slate-900">
                <AlertCircle
                    className="mx-auto h-10 w-10 text-rose-500"
                    aria-hidden="true"
                />
                <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
                    {t(`errors.${loadErrorCode}.title`)}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                    {t(`errors.${loadErrorCode}.description`)}
                </p>
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-sm font-black text-white"
                >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {t("retry")}
                </button>
            </section>
        );
    }

    if (items.length === 0) {
        return (
            <section className="mt-5 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/15 dark:bg-slate-900">
                <UserRoundX
                    className="mx-auto h-10 w-10 text-slate-300"
                    aria-hidden="true"
                />
                <h2 className="mt-4 text-lg font-black text-slate-800 dark:text-white">
                    {t(
                        appliedKeyword
                            ? "emptySearch.title"
                            : "empty.title",
                    )}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                    {t(
                        appliedKeyword
                            ? "emptySearch.description"
                            : "empty.description",
                    )}
                </p>
            </section>
        );
    }

    return (
        <section
            className="mt-5 space-y-3"
            aria-label={t("listLabel")}
        >
            {items.map((item) => (
                <article
                    key={item.banId}
                    data-testid={`open-chat-ban-card-${item.banId}`}
                    className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
                >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                        <OpenChatAvatar
                            profileImageUrl={item.profileImageUrl}
                            alt={item.nickname}
                            size="lg"
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="truncate text-xl font-black text-slate-900 dark:text-white">
                                    {item.nickname}
                                </h2>
                                <code
                                    aria-label={`${t("card.memberCode")}: ${item.memberCode}`}
                                    className="rounded-full bg-orange-50 px-2.5 py-1 font-mono text-xs font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-200"
                                >
                                    {item.memberCode}
                                </code>
                            </div>
                            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                <div>
                                    <dt className="font-bold text-slate-400">
                                        {t("card.lastJoinedAt")}
                                    </dt>
                                    <dd className="mt-1 inline-flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                                        <CalendarDays
                                            className="h-4 w-4"
                                            aria-hidden="true"
                                        />
                                        {formatDate(item.lastJoinedAt)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-bold text-slate-400">
                                        {t("card.bannedAt")}
                                    </dt>
                                    <dd className="mt-1 font-bold text-slate-700 dark:text-slate-200">
                                        {formatDate(item.bannedAt)}
                                    </dd>
                                </div>
                            </dl>
                            <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                                    {t("card.reason")}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                                    {item.reason}
                                </p>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
                                <span>{t("card.bannedBy")}</span>
                                <strong>{item.bannedBy.nickname}</strong>
                                <OpenChatRoleBadge
                                    role={item.bannedBy.role}
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            data-testid={`open-chat-ban-release-${item.banId}`}
                            disabled={!item.releasable}
                            onClick={() => onOpenRelease(item)}
                            className="min-h-11 shrink-0 rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-black text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-emerald-400/30 dark:text-emerald-200 dark:hover:bg-emerald-500/10 dark:disabled:border-white/10 dark:disabled:text-slate-500"
                        >
                            {item.releasable
                                ? t("card.release")
                                : t("card.notReleasable")}
                        </button>
                    </div>
                </article>
            ))}

            {hasNext && (
                <button
                    type="button"
                    data-testid="open-chat-blacklist-load-more"
                    disabled={isLoadingMore}
                    onClick={onLoadMore}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:border-violet-300 hover:text-violet-600 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                >
                    {isLoadingMore && (
                        <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                        />
                    )}
                    {t("loadMore")}
                </button>
            )}
        </section>
    );
}
