"use client";

import { AlertCircle, Loader2, RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { OpenChatProfileForm } from "@/components/chat/open-profile/OpenChatProfileForm";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import { openChatService } from "@/services/chat/openChatService";
import { getApiErrorCode } from "@/services/common/responseParser";
import type {
    OpenChatMemberProfile,
    OpenChatProfileFormValue,
} from "@/types/chat";

interface OpenChatProfileEditModalProps {
    isOpen: boolean;
    roomId: number;
    roomActive: boolean;
    profile: OpenChatMemberProfile | null;
    isLoading: boolean;
    loadErrorCode: string | null;
    onRetry: () => Promise<void>;
    onProfileChanged: (
        profile: OpenChatMemberProfile,
    ) => Promise<void> | void;
    onAccessStateReload: () => Promise<void>;
    onClose: () => void;
}

type ProcessStage = "SAVING" | "UPLOADING" | "DELETING";

function toEditErrorCode(error: unknown): string {
    const errorCode = getApiErrorCode(error);

    switch (errorCode) {
        case "OPEN_CHAT_NICKNAME_REQUIRED":
            return "NICKNAME_REQUIRED";
        case "OPEN_CHAT_NICKNAME_TOO_LONG":
            return "NICKNAME_TOO_LONG";
        case "OPEN_CHAT_ROOM_CLOSED":
            return "ROOM_CLOSED";
        case "OPEN_CHAT_MEMBER_ACCESS_DENIED":
        case "OPEN_CHAT_MEMBER_NOT_FOUND":
        case "OPEN_CHAT_PROFILE_NOT_FOUND":
            return "ACCESS_DENIED";
        case "PROFILE_IMAGE_FILE_TOO_LARGE":
            return "FILE_TOO_LARGE";
        case "PROFILE_IMAGE_UNSUPPORTED_CONTENT_TYPE":
        case "PROFILE_IMAGE_CONTENT_TYPE_MISMATCH":
        case "PROFILE_IMAGE_INVALID_BINARY":
            return "UNSUPPORTED_TYPE";
        default:
            return "SAVE_FAILED";
    }
}

export function OpenChatProfileEditModal({
    isOpen,
    roomId,
    roomActive,
    profile,
    isLoading,
    loadErrorCode,
    onRetry,
    onProfileChanged,
    onAccessStateReload,
    onClose,
}: OpenChatProfileEditModalProps) {
    const t = useTranslations("ChatRoom.openProfile");
    const dialogRef = useRef<HTMLElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [processStage, setProcessStage] =
        useState<ProcessStage | null>(null);
    const [submitErrorCode, setSubmitErrorCode] =
        useState<string | null>(null);

    const close = useCallback(() => {
        if (!isSubmitting) {
            setSubmitErrorCode(null);
            setProcessStage(null);
            onClose();
        }
    }, [isSubmitting, onClose]);

    useModalFocusTrap(isOpen, dialogRef, close);

    const handleSubmit = useCallback(
        async (value: OpenChatProfileFormValue) => {
            if (!profile || !roomActive || isSubmitting) {
                return false;
            }

            setIsSubmitting(true);
            setSubmitErrorCode(null);

            try {
                let latestProfile = profile;

                if (value.nickname !== profile.nickname) {
                    setProcessStage("SAVING");
                    latestProfile = await openChatService.updateMyProfile(
                        roomId,
                        { nickname: value.nickname },
                    );
                    await onProfileChanged(latestProfile);
                }

                if (value.imageFile) {
                    setProcessStage("UPLOADING");
                    latestProfile =
                        await openChatService.uploadMyProfileImage(
                            roomId,
                            value.imageFile,
                        );
                    await onProfileChanged(latestProfile);
                } else if (
                    value.removeImage &&
                    profile.profileImageUrl
                ) {
                    setProcessStage("DELETING");
                    latestProfile =
                        await openChatService.deleteMyProfileImage(roomId);
                    await onProfileChanged(latestProfile);
                }

                setProcessStage(null);
                onClose();
                return true;
            } catch (error) {
                console.error(
                    "Failed to update OPEN chat profile.",
                    error,
                );
                const nextErrorCode = toEditErrorCode(error);
                setSubmitErrorCode(nextErrorCode);

                if (
                    nextErrorCode === "ROOM_CLOSED" ||
                    nextErrorCode === "ACCESS_DENIED"
                ) {
                    await onAccessStateReload();
                }

                return false;
            } finally {
                setIsSubmitting(false);
                setProcessStage(null);
            }
        },
        [
            isSubmitting,
            onAccessStateReload,
            onClose,
            onProfileChanged,
            profile,
            roomActive,
            roomId,
        ],
    );

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-1200 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
            onMouseDown={close}
            data-testid="open-chat-profile-edit-overlay"
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="open-chat-profile-edit-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/10 bg-white p-5 shadow-2xl dark:bg-slate-950 sm:p-7"
                data-testid="open-chat-profile-edit-modal"
            >
                <header className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
                            {t("edit.eyebrow")}
                        </p>
                        <h2
                            id="open-chat-profile-edit-title"
                            className="mt-1 text-2xl font-black text-slate-900 dark:text-white"
                        >
                            {t("edit.title")}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                            {t("edit.description")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        disabled={isSubmitting}
                        aria-label={t("edit.close")}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </header>

                {!roomActive ? (
                    <div
                        role="alert"
                        className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-400/30 dark:bg-rose-500/10"
                    >
                        <AlertCircle className="mx-auto h-9 w-9 text-rose-500" aria-hidden="true" />
                        <p className="mt-3 font-black text-rose-700 dark:text-rose-200">
                            {t("errors.ROOM_CLOSED")}
                        </p>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-16 text-sm font-bold text-slate-500 dark:text-slate-300">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                        {t("edit.loading")}
                    </div>
                ) : loadErrorCode || !profile ? (
                    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-400/30 dark:bg-rose-500/10">
                        <AlertCircle className="mx-auto h-9 w-9 text-rose-500" aria-hidden="true" />
                        <p className="mt-3 font-black text-rose-700 dark:text-rose-200">
                            {t("edit.loadFailed")}
                        </p>
                        <button
                            type="button"
                            onClick={() => void onRetry()}
                            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2 text-sm font-black text-white transition hover:bg-rose-600"
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            {t("edit.retry")}
                        </button>
                    </div>
                ) : (
                    <OpenChatProfileForm
                        mode="edit"
                        initialProfile={profile}
                        isSubmitting={isSubmitting}
                        processStage={processStage}
                        errorCode={submitErrorCode}
                        onSubmit={handleSubmit}
                        onCancel={close}
                    />
                )}
            </section>
        </div>,
        document.body,
    );
}
