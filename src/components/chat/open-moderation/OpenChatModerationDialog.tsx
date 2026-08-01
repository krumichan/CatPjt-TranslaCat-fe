"use client";

import { AlertCircle, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";
import { createPortal } from "react-dom";

import type { OpenChatModerationErrorCode } from "@/hooks/chat/useOpenChatModeration";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import type { OpenChatMemberProfile } from "@/types/chat";
import type { OpenChatModerationAction } from "@/utils/chat/openChatModeration";

interface OpenChatModerationDialogProps {
    action: OpenChatModerationAction | null;
    target: OpenChatMemberProfile | null;
    reason: string;
    isSubmitting: boolean;
    errorCode: OpenChatModerationErrorCode | null;
    onReasonChange: (value: string) => void;
    onClose: () => void;
    onSubmit: () => Promise<boolean>;
}

export function OpenChatModerationDialog({
    action,
    target,
    reason,
    isSubmitting,
    errorCode,
    onReasonChange,
    onClose,
    onSubmit,
}: OpenChatModerationDialogProps) {
    const t = useTranslations("ChatRoom.openModeration.dialog");
    const dialogRef = useRef<HTMLElement>(null);
    const isOpen = action !== null && target !== null;
    const close = useCallback(() => {
        if (!isSubmitting) {
            onClose();
        }
    }, [isSubmitting, onClose]);

    useModalFocusTrap(isOpen, dialogRef, close);

    if (!isOpen || !action || !target || typeof document === "undefined") {
        return null;
    }

    const isBan = action === "BAN";

    return createPortal(
        <div
            className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            onMouseDown={close}
            data-testid="open-chat-moderation-dialog-overlay"
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="open-chat-moderation-dialog-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white p-6 shadow-2xl dark:bg-slate-950 sm:p-7"
                data-testid="open-chat-moderation-dialog"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                            {t("eyebrow")}
                        </p>
                        <h2
                            id="open-chat-moderation-dialog-title"
                            className="mt-2 text-xl font-black text-slate-900 dark:text-white"
                        >
                            {t(`${action}.title`)}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        disabled={isSubmitting}
                        aria-label={t("close")}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50 dark:hover:bg-white/10"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-300">
                    {t(`${action}.description`)}
                </p>

                <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 rounded-3xl bg-slate-50 p-4 text-sm dark:bg-white/5">
                    <dt className="font-bold text-slate-400">{t("targetNickname")}</dt>
                    <dd className="text-right font-black text-slate-800 dark:text-slate-100">
                        {target.nickname}
                    </dd>
                    <dt className="font-bold text-slate-400">{t("memberCode")}</dt>
                    <dd className="text-right font-mono font-black text-slate-800 dark:text-slate-100">
                        {target.memberCode}
                    </dd>
                    {!isBan && (
                        <>
                            <dt className="font-bold text-slate-400">{t("nextRole")}</dt>
                            <dd className="text-right font-black text-slate-800 dark:text-slate-100">
                                {t(
                                    `roles.${
                                        action === "ASSIGN_ADMIN"
                                            ? "ADMIN"
                                            : "MEMBER"
                                    }`,
                                )}
                            </dd>
                        </>
                    )}
                </dl>

                {isBan && (
                    <div className="mt-5">
                        <label
                            htmlFor="open-chat-ban-reason"
                            className="text-sm font-black text-slate-800 dark:text-slate-100"
                        >
                            {t("reason.label")}
                        </label>
                        <textarea
                            id="open-chat-ban-reason"
                            data-testid="open-chat-ban-reason"
                            value={reason}
                            maxLength={500}
                            rows={4}
                            disabled={isSubmitting}
                            onChange={(event) => onReasonChange(event.target.value)}
                            placeholder={t("reason.placeholder")}
                            aria-invalid={
                                errorCode === "REASON_REQUIRED" ||
                                errorCode === "REASON_TOO_LONG"
                            }
                            aria-describedby={
                                errorCode
                                    ? "open-chat-ban-reason-help open-chat-moderation-error"
                                    : "open-chat-ban-reason-help"
                            }
                            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-orange-400/20"
                        />
                        <div
                            id="open-chat-ban-reason-help"
                            className="mt-1 flex justify-between gap-3 text-xs text-slate-400"
                        >
                            <span>{t("reason.help")}</span>
                            <span>{reason.length}/500</span>
                        </div>
                    </div>
                )}

                {errorCode && (
                    <p
                        id="open-chat-moderation-error"
                        role="alert"
                        className="mt-4 flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
                    >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        {t(`errors.${errorCode}`)}
                    </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={close}
                        disabled={isSubmitting}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                    >
                        {t("cancel")}
                    </button>
                    <button
                        type="button"
                        data-testid="open-chat-moderation-confirm"
                        onClick={() => void onSubmit()}
                        disabled={isSubmitting}
                        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isBan
                                ? "bg-rose-500 hover:bg-rose-600"
                                : "bg-orange-500 hover:bg-orange-600"
                        }`}
                    >
                        {isSubmitting && (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        )}
                        {t(`${action}.confirm`)}
                    </button>
                </div>
            </section>
        </div>,
        document.body,
    );
}
