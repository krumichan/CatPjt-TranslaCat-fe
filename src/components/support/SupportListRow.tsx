"use client";

import { ChevronRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { SupportNoticeTypeBadge } from "@/components/support/SupportNoticeTypeBadge";
import { SupportStatusBadge } from "@/components/support/SupportStatusBadge";
import type { SupportItem } from "@/types/support";

export function SupportListRow({ item, isAdmin, onOpen }: { item: SupportItem; isAdmin: boolean; onOpen: () => void }) {
    const t = useTranslations("Support");
    const format = useFormatter();
    const isUnread = "unread" in item ? item.unread : "readAt" in item && !item.readAt;

    return (
        <button
            type="button"
            onClick={onOpen}
            className="flex w-full items-center gap-3 border-b border-slate-100 px-1 py-5 text-left transition hover:bg-slate-50 sm:gap-5 dark:border-white/5 dark:hover:bg-white/5"
        >
            <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold leading-6 text-slate-800 dark:text-slate-100">
                    {"noticeType" in item && (
                        <span className="mr-2 inline-block">
                            <SupportNoticeTypeBadge noticeType={item.noticeType} />
                        </span>
                    )}
                    {item.title}
                    {isUnread && (
                        <span aria-label={t("unread")} className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-violet-500 align-middle" />
                    )}
                </span>
                <span className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {"category" in item && <span>{t(`category.${item.category}`)}</span>}
                    {"user" in item && isAdmin && <span>· {item.user.name}</span>}
                    {"recipient" in item && <span>{isAdmin ? t("messages.to", { name: item.recipient.name }) : item.senderName}</span>}
                    <time dateTime={item.createdAt}>
                        {format.dateTime(new Date(item.createdAt), { year: "numeric", month: "2-digit", day: "2-digit" })}
                    </time>
                    {"replyCount" in item && item.replyCount !== undefined && (
                        <span>· {t("inquiries.replyCount", { count: item.replyCount })}</span>
                    )}
                </span>
            </span>

            {"status" in item ? (
                <SupportStatusBadge status={item.status} />
            ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            )}
        </button>
    );
}
