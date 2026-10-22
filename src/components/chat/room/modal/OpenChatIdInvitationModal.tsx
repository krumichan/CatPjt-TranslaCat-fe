"use client";

import { Loader2, UserPlus, X } from "lucide-react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import type { useOpenChatIdInvitation } from "@/hooks/chat/useOpenChatIdInvitation";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";

type InvitationState = ReturnType<typeof useOpenChatIdInvitation>;

export function OpenChatIdInvitationModal({
    invitation,
}: {
    invitation: InvitationState;
}) {
    const t = useTranslations("ChatRoom.openIdInvitation");
    const dialogRef = useRef<HTMLDivElement>(null);
    useModalFocusTrap(invitation.isOpen, dialogRef, invitation.close);

    if (!invitation.isOpen || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-1300 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            onMouseDown={invitation.close}
            data-testid="open-chat-id-invitation-overlay"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="open-chat-id-invitation-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950"
                data-testid="open-chat-id-invitation-dialog"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 id="open-chat-id-invitation-title" className="text-xl font-black text-slate-900 dark:text-white">
                            {t("title")}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                            {t("description")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={invitation.close}
                        disabled={invitation.isSubmitting}
                        aria-label={t("close")}
                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/10"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <form
                    className="mt-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void invitation.submit();
                    }}
                >
                    <label htmlFor="open-chat-invite-public-id" className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {t("publicIdLabel")}
                    </label>
                    <input
                        id="open-chat-invite-public-id"
                        data-testid="open-chat-invite-public-id"
                        value={invitation.targetPublicId}
                        onChange={(event) => invitation.updateTarget(event.target.value)}
                        maxLength={255}
                        autoComplete="off"
                        disabled={invitation.isSubmitting}
                        placeholder={t("publicIdPlaceholder")}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none focus:border-orange-500 dark:border-white/20 dark:bg-slate-900 dark:text-white"
                    />

                    {invitation.errorCode && (
                        <p role="alert" className="mt-3 text-sm font-semibold text-rose-600 dark:text-rose-300">
                            {t(`errors.${invitation.errorCode}`)}
                        </p>
                    )}
                    {invitation.successCode && (
                        <p role="status" className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            {t(`success.${invitation.successCode}`)}
                        </p>
                    )}

                    <button
                        type="submit"
                        data-testid="open-chat-id-invitation-submit"
                        disabled={invitation.isSubmitting}
                        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                        {invitation.isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <UserPlus className="h-4 w-4" aria-hidden="true" />
                        )}
                        {t("submit")}
                    </button>
                </form>
            </div>
        </div>,
        document.body,
    );
}
