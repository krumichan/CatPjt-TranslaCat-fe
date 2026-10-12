"use client";

import { CornerDownRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { SupportReplyNode } from "@/features/support/supportModel";
import type { SupportReply } from "@/types/support";

export function SupportReplyCard({ node, disabled, onReply }: { node: SupportReplyNode; disabled: boolean; onReply: (reply: SupportReply) => void }) {
    const t = useTranslations("Support");
    const format = useFormatter();
    const { reply, parent, depth } = node;
    const isAdmin = reply.authorRole === "ADMIN";

    return (
        <article
            id={`support-reply-${reply.id}`}
            data-testid={`support-reply-${reply.id}`}
            tabIndex={-1}
            style={{ marginLeft: `${Math.min(depth, 2) * 12}px` }}
            className={`scroll-mt-28 rounded-2xl border-l-[3px] p-4 outline-none focus:ring-2 focus:ring-violet-400 sm:p-5 ${isAdmin
                ? "border-violet-400 bg-violet-50/80 dark:border-violet-400 dark:bg-violet-400/10"
                : "border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-white/5"}`}
        >
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{reply.authorName}</span>
                {isAdmin && (
                    <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-400/20 dark:text-violet-200">
                        {t("administrator")}
                    </span>
                )}
                <time dateTime={reply.createdAt} className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
                    {format.dateTime(new Date(reply.createdAt), { dateStyle: "short", timeStyle: "short" })}
                </time>
            </div>

            {parent && (
                <blockquote className="mt-3 border-l-2 border-slate-300 pl-3 text-xs leading-5 text-slate-500 dark:border-slate-600 dark:text-slate-400">
                    <span className="block font-medium">{t("inquiries.replyingTo", { name: parent.authorName })}</span>
                    <span className="line-clamp-2 break-words">{parent.content}</span>
                </blockquote>
            )}

            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">{reply.content}</p>
            {!disabled && (
                <button
                    type="button"
                    onClick={() => onReply(reply)}
                    className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-300"
                >
                    <CornerDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("inquiries.replyTo")}
                </button>
            )}
        </article>
    );
}
