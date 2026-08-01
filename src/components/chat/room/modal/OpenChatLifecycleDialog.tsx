"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import { OpenChatAvatar } from "@/components/chat/open-profile/OpenChatAvatar";
import type {
    OpenChatLifecycleDialogMode,
    OpenChatLifecycleErrorCode,
} from "@/hooks/chat/useOpenChatRoomLifecycle";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import type { OpenChatMemberProfile } from "@/types/chat";

interface OpenChatLifecycleDialogProps {
    mode: OpenChatLifecycleDialogMode;
    candidates: OpenChatMemberProfile[];
    selectedTargetId: number | null;
    isSubmitting: boolean;
    errorCode: OpenChatLifecycleErrorCode | null;
    onClose: () => void;
    onSelectTarget: (openChatMemberId: number) => void;
    onSubmit: () => Promise<boolean>;
    onAcknowledgeClosed: () => void;
}

export function OpenChatLifecycleDialog({
    mode,
    candidates,
    selectedTargetId,
    isSubmitting,
    errorCode,
    onClose,
    onSelectTarget,
    onSubmit,
    onAcknowledgeClosed,
}: OpenChatLifecycleDialogProps) {
    const t = useTranslations("ChatRoom.openLifecycle");
    const dialogRef = useRef<HTMLDivElement>(null);
    const isOpen = mode !== null;
    useModalFocusTrap(
        isOpen,
        dialogRef,
        mode === "CLOSED_NOTICE" ? onAcknowledgeClosed : onClose,
    );

    if (!mode || typeof document === "undefined") {
        return null;
    }

    const title = t(`dialog.${mode}.title`);
    const description = t(`dialog.${mode}.description`);

    return createPortal(
        <div
            className="fixed inset-0 z-1300 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            onMouseDown={mode === "CLOSED_NOTICE" ? undefined : onClose}
            data-testid="open-chat-lifecycle-dialog-overlay"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="open-chat-lifecycle-dialog-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-950"
                data-testid={`open-chat-lifecycle-dialog-${mode}`}
            >
                <header className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-200">
                            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                            <h2 id="open-chat-lifecycle-dialog-title" className="text-xl font-black text-slate-900 dark:text-white">
                                {title}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                                {description}
                            </p>
                        </div>
                    </div>
                    {mode !== "CLOSED_NOTICE" && (
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                            aria-label={t("close")}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                        >
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    )}
                </header>

                {mode === "TRANSFER_AND_LEAVE" && (
                    <fieldset className="mt-6">
                        <legend className="text-sm font-black text-slate-800 dark:text-slate-100">
                            {t("transfer.targetLabel")}
                        </legend>
                        <div className="mt-3 space-y-2">
                            {candidates.map((member) => (
                                <label
                                    key={member.openChatMemberId}
                                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${
                                        selectedTargetId === member.openChatMemberId
                                            ? "border-orange-400 bg-orange-50 dark:bg-orange-500/10"
                                            : "border-slate-200 dark:border-white/10"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="open-chat-owner-target"
                                        value={member.openChatMemberId}
                                        checked={selectedTargetId === member.openChatMemberId}
                                        onChange={() => onSelectTarget(member.openChatMemberId)}
                                        className="sr-only"
                                    />
                                    <OpenChatAvatar
                                        profileImageUrl={member.profileImageUrl}
                                        alt={member.nickname}
                                        size="sm"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                                            {member.nickname}
                                        </p>
                                        <p className="mt-1 font-mono text-xs font-bold text-orange-500">
                                            {member.memberCode}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                )}

                {errorCode && (
                    <p role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                        {t(`errors.${errorCode}`)}
                    </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    {mode === "CLOSED_NOTICE" ? (
                        <button
                            type="button"
                            onClick={onAcknowledgeClosed}
                            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white"
                        >
                            {t("goToExplore")}
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={onClose}
                                className="min-h-11 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 disabled:opacity-50 dark:border-white/10 dark:text-slate-200"
                            >
                                {t("cancel")}
                            </button>
                            <button
                                type="button"
                                data-testid="open-chat-lifecycle-confirm"
                                disabled={isSubmitting}
                                onClick={() => void onSubmit()}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {t(`dialog.${mode}.confirm`)}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
