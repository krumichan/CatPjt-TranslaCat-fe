"use client";

import { AlertTriangle, X } from "lucide-react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import { OpenChatProfileForm } from "@/components/chat/open-profile/OpenChatProfileForm";
import type {
    OpenChatJoinErrorCode,
    OpenChatJoinProcessStage,
} from "@/hooks/chat/useOpenChatJoin";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import type {
    OpenChatProfileFormMode,
    OpenChatProfileFormValue,
    OpenChatRoomDetail,
} from "@/types/chat";

interface OpenChatJoinDialogProps {
    isOpen: boolean;
    room: OpenChatRoomDetail;
    mode: OpenChatProfileFormMode;
    isSubmitting: boolean;
    processStage: OpenChatJoinProcessStage | null;
    errorCode: OpenChatJoinErrorCode | null;
    joinedPendingImage: boolean;
    onClose: () => void;
    onSubmit: (value: OpenChatProfileFormValue) => Promise<boolean>;
}

export function OpenChatJoinDialog({
    isOpen,
    room,
    mode,
    isSubmitting,
    processStage,
    errorCode,
    joinedPendingImage,
    onClose,
    onSubmit,
}: OpenChatJoinDialogProps) {
    const t = useTranslations("OpenChatDetail");
    const dialogRef = useRef<HTMLDivElement>(null);
    useModalFocusTrap(isOpen, dialogRef, onClose);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-1200 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            onMouseDown={onClose}
            data-testid="open-chat-join-dialog-overlay"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="open-chat-join-dialog-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/10 bg-white p-5 shadow-2xl dark:bg-slate-950 sm:p-7"
                data-testid="open-chat-join-dialog"
            >
                <header className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                            {t("join.eyebrow")}
                        </p>
                        <h2
                            id="open-chat-join-dialog-title"
                            className="mt-1 text-2xl font-black text-slate-950 dark:text-white"
                        >
                            {mode === "rejoin"
                                ? t("join.rejoinTitle", { name: room.name })
                                : t("join.title", { name: room.name })}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label={t("join.close")}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </header>

                {mode === "rejoin" && (
                    <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                        <p>{t("join.rejoinNotice")}</p>
                    </div>
                )}

                {joinedPendingImage && (
                    <div
                        role="status"
                        className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-100"
                    >
                        {t("join.partialSuccess")}
                    </div>
                )}

                <div className="mt-6">
                    <OpenChatProfileForm
                        mode={mode}
                        initialProfile={room.myOpenProfile}
                        isSubmitting={isSubmitting}
                        processStage={processStage}
                        errorCode={errorCode}
                        submitLabel={
                            joinedPendingImage
                                ? t("join.retryImage")
                                : mode === "rejoin"
                                  ? t("join.rejoinSubmit")
                                  : t("join.submit")
                        }
                        onSubmit={onSubmit}
                        onCancel={onClose}
                    />
                </div>
            </div>
        </div>,
        document.body,
    );
}
