"use client";

import { Mail, Pencil, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { GuideHelpLink } from "@/components/common/GuideHelpLink";
import { SupportNoticeTypeBadge } from "@/components/support/SupportNoticeTypeBadge";
import { supportSecondaryButton } from "@/components/support/supportStyles";
import type { SupportController } from "@/hooks/support/useSupportController";
import type { SupportMessage, SupportNotice } from "@/types/support";

export function SupportContentDetail({ item, controller }: { item: SupportNotice | SupportMessage; controller: SupportController }) {
    const t = useTranslations("Support");
    const format = useFormatter();
    const isNotice = "noticeType" in item;

    return (
        <article>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {isNotice ? (
                    <SupportNoticeTypeBadge noticeType={item.noticeType} />
                ) : (
                    <span className="rounded-lg bg-violet-50 px-2.5 py-1 font-medium text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
                        {t("messages.personal")}
                    </span>
                )}
                <span>{t(isNotice ? "notices.audience" : "messages.private")}</span>
            </div>

            <div className="flex flex-wrap items-center gap-1">
                <h2 className="break-words text-xl font-bold leading-8 text-slate-900 sm:text-2xl dark:text-white">{item.title}</h2>
                <GuideHelpLink topic={isNotice ? "support/notices" : "support/messages"} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                <span>{isNotice ? item.authorName : `${item.senderName} → ${item.recipient.name}`}</span>
                <span>·</span>
                <time dateTime={item.createdAt}>{format.dateTime(new Date(item.createdAt), { dateStyle: "medium", timeStyle: "short" })}</time>
                {!isNotice && <span>· {t(item.readAt ? "read" : "unread")}</span>}
            </div>

            <p className="my-7 whitespace-pre-wrap break-words border-b border-slate-200 pb-8 text-sm leading-8 text-slate-700 dark:border-white/10 dark:text-slate-200">{item.content}</p>

            {isNotice && controller.isAdmin && (
                <div className="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        disabled={controller.isBusy}
                        onClick={() => controller.navigate("notices", { id: item.id, view: "edit" })}
                        className={supportSecondaryButton}
                    >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        {t("edit")}
                    </button>
                    <button
                        type="button"
                        disabled={controller.isBusy}
                        onClick={() => controller.setDeleteOpen(true)}
                        className={`${supportSecondaryButton} text-red-600! dark:text-red-300!`}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        {t("delete")}
                    </button>
                </div>
            )}

            {!isNotice && !controller.isAdmin && (
                <button
                    type="button"
                    onClick={() => controller.navigate("inquiries", { view: "new", relatedMessageId: item.id })}
                    className={supportSecondaryButton}
                >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {t("messages.askAbout")}
                </button>
            )}
        </article>
    );
}
