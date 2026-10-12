"use client";

import { CornerDownRight, LockKeyhole, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { SupportReplyCard } from "@/components/support/SupportReplyCard";
import { SupportStatusBadge } from "@/components/support/SupportStatusBadge";
import { supportInput, supportLabel, supportPrimaryButton, supportSecondaryButton } from "@/components/support/supportStyles";
import { buildSupportReplyThread } from "@/features/support/supportModel";
import type { SupportController } from "@/hooks/support/useSupportController";
import { useSupportReplyComposer } from "@/hooks/support/useSupportReplyComposer";
import type { SupportInquiry } from "@/types/support";

export function SupportInquiryDetail({ inquiry, controller }: { inquiry: SupportInquiry; controller: SupportController }) {
    const t = useTranslations("Support");
    const format = useFormatter();
    const {
        content, setContent, parent, setParent,
        setInputElement, selectParent, reset,
    } = useSupportReplyComposer();
    const replies = buildSupportReplyThread(inquiry.replies ?? []);
    const isClosed = inquiry.status === "CLOSED";

    return (
        <article>
            <div className="mb-3 flex flex-wrap items-center gap-3">
                <SupportStatusBadge status={inquiry.status} />
                <span className="text-xs text-slate-500">#{inquiry.id} · {t(`category.${inquiry.category}`)}</span>
            </div>

            <h2 className="break-words text-xl font-bold leading-8 text-slate-900 sm:text-2xl dark:text-white">{inquiry.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                <span>{inquiry.user.name}</span>
                <span>·</span>
                <time dateTime={inquiry.createdAt}>{format.dateTime(new Date(inquiry.createdAt), { dateStyle: "medium", timeStyle: "short" })}</time>
                <span className="inline-flex items-center gap-1">
                    <LockKeyhole className="h-3 w-3" aria-hidden="true" />
                    {t("inquiries.private")}
                </span>
            </div>

            <div className="my-6 border-b border-slate-200 pb-7 dark:border-white/10">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">{inquiry.content}</p>
                {inquiry.relatedMessageId && (
                    <button
                        type="button"
                        onClick={() => controller.navigate("messages", { id: inquiry.relatedMessageId! })}
                        className="mt-4 text-sm font-medium text-violet-600 dark:text-violet-300"
                    >
                        {t("inquiries.relatedMessage")}
                    </button>
                )}
            </div>

            <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">{t("inquiries.conversation")} <span className="ml-2 text-slate-400">{replies.length}</span></h3>
            <div className="space-y-3">
                {replies.map((node) => (
                    <SupportReplyCard
                        key={node.reply.id}
                        node={node}
                        disabled={controller.isBusy || isClosed}
                        onReply={selectParent}
                    />
                ))}
                {replies.length === 0 && (
                    <p className="rounded-xl bg-slate-50 p-5 text-sm leading-6 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                        {t(controller.isAdmin ? "inquiries.waitingAdmin" : "inquiries.waitingUser")}
                    </p>
                )}
            </div>

            {isClosed ? (
                <div className="mt-7 rounded-2xl border border-slate-200 p-5 dark:border-white/10">
                    <p className="mb-4 text-sm text-slate-500">{t("inquiries.closedGuide")}</p>
                    <button
                        type="button"
                        disabled={controller.isBusy}
                        onClick={() => void controller.changeStatus("WAITING")}
                        className={supportSecondaryButton}
                    >
                        {t("inquiries.reopen")}
                    </button>
                </div>
            ) : (
                <form
                    className="mt-7 border-t border-slate-200 pt-6 dark:border-white/10"
                    onSubmit={async (event) => {
                        event.preventDefault();

                        // 공백뿐인 답변은 서버에 전송하지 않는다.
                        if (!content.trim()) {
                            return;
                        }

                        const submitted = await controller.submitReply(content, parent?.id);

                        // 전송 성공 때만 초안을 지워 실패 시 내용을 보존한다.
                        if (submitted) {
                            reset();
                        }
                    }}
                >
                    {parent && (
                        <div className="mb-3 flex items-start gap-2 rounded-xl bg-violet-50 p-3 text-xs text-violet-700 dark:bg-violet-400/10 dark:text-violet-200">
                            <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">{t("inquiries.replyingTo", { name: parent.authorName })}</p>
                                <p className="mt-1 line-clamp-2 break-words leading-5">{parent.content}</p>
                            </div>
                            <button
                                type="button"
                                aria-label={t("inquiries.cancelReplyTarget")}
                                onClick={() => setParent(null)}
                                className="rounded-lg p-1 hover:bg-violet-100 dark:hover:bg-white/10"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                    )}

                    <label className={supportLabel}>
                        {t(controller.isAdmin ? "inquiries.replyContent" : "inquiries.followupContent")}
                        <textarea
                            ref={setInputElement}
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            required
                            maxLength={10000}
                            rows={5}
                            disabled={controller.isBusy}
                            className={`${supportInput} resize-y`}
                            placeholder={t(controller.isAdmin ? "inquiries.replyPlaceholder" : "inquiries.followupPlaceholder")}
                        />
                    </label>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            disabled={controller.isBusy}
                            onClick={() => void controller.changeStatus("CLOSED")}
                            className={supportSecondaryButton}
                        >
                            {t(controller.isAdmin ? "inquiries.close" : "inquiries.resolved")}
                        </button>
                        <button
                            type="submit"
                            disabled={controller.isBusy || !content.trim()}
                            className={supportPrimaryButton}
                        >
                            {t(controller.isBusy ? "processing" : controller.isAdmin ? "inquiries.submitReply" : "inquiries.submitFollowup")}
                        </button>
                    </div>
                </form>
            )}
        </article>
    );
}
