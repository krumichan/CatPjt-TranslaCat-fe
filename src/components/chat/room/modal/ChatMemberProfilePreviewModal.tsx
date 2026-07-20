"use client";

import {
    AlertCircle,
    Loader2,
    RefreshCw,
    Send,
    UserCheck,
    UserMinus,
    X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
    useEffect,
    useRef,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import UserProfilePreviewModal from "@/components/profile/UserProfilePreviewModal";
import type {
    ChatMemberFriendRequestErrorCode,
    ChatMemberProfileLoadErrorCode,
} from "@/hooks/chat/useChatMemberProfilePreview";
import type { ChatRoomMemberProfile } from "@/types/chat";

interface ChatMemberProfilePreviewModalProps {
    isOpen: boolean;
    profile: ChatRoomMemberProfile | null;
    isLoading: boolean;
    isSendingFriendRequest: boolean;
    loadErrorCode: ChatMemberProfileLoadErrorCode | null;
    friendRequestErrorCode:
        | ChatMemberFriendRequestErrorCode
        | null;
    onRetry: () => Promise<boolean>;
    onSendFriendRequest: () => Promise<boolean>;
    onClose: () => void;
}

export function ChatMemberProfilePreviewModal({
    isOpen,
    profile,
    isLoading,
    isSendingFriendRequest,
    loadErrorCode,
    friendRequestErrorCode,
    onRetry,
    onSendFriendRequest,
    onClose,
}: ChatMemberProfilePreviewModalProps) {
    const t = useTranslations("ChatRoom.memberProfile");

    if (!isOpen) {
        return null;
    }

    if (isLoading || loadErrorCode || !profile) {
        return (
            <ChatMemberProfileStateDialog
                isLoading={isLoading}
                hasError={loadErrorCode !== null}
                loadingText={t("loading")}
                errorTitle={t("loadFailed")}
                retryLabel={t("retry")}
                closeLabel={t("close")}
                onRetry={onRetry}
                onClose={onClose}
            />
        );
    }

    return (
        <UserProfilePreviewModal
            isOpen={isOpen}
            profile={profile}
            titleId="chat-member-profile-preview-title"
            closeLabel={t("close")}
            profileAlt={t("profileAlt", {
                nickname: profile.displayName,
            })}
            bioLabel={t("bio")}
            emptyBioText={t("emptyBio")}
            isProcessing={isSendingFriendRequest}
            onClose={onClose}
        >
            <FriendRelationAction
                profile={profile}
                isSending={isSendingFriendRequest}
                errorCode={friendRequestErrorCode}
                onSend={onSendFriendRequest}
            />
        </UserProfilePreviewModal>
    );
}

function FriendRelationAction({
    profile,
    isSending,
    errorCode,
    onSend,
}: {
    profile: ChatRoomMemberProfile;
    isSending: boolean;
    errorCode:
        | ChatMemberFriendRequestErrorCode
        | null;
    onSend: () => Promise<boolean>;
}) {
    const t = useTranslations(
        "ChatRoom.memberProfile.friendAction",
    );

    return (
        <div className="mt-6">
            {profile.friendStatus === "NONE" && (
                <button
                    type="button"
                    disabled={isSending}
                    onClick={() => void onSend()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                >
                    {isSending ? (
                        <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                        />
                    ) : (
                        <Send
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                    )}

                    {isSending
                        ? t("sending")
                        : t("send")}
                </button>
            )}

            {profile.friendStatus ===
                "REQUEST_SENT" && (
                <RelationNotice
                    icon={
                        <UserCheck
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                    }
                    text={t("sent")}
                />
            )}

            {profile.friendStatus ===
                "REQUEST_RECEIVED" && (
                <RelationNotice
                    icon={
                        <UserMinus
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                    }
                    text={t("received")}
                />
            )}

            {errorCode && (
                <p
                    role="alert"
                    className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                >
                    {t(`errors.${errorCode}`)}
                </p>
            )}
        </div>
    );
}

function RelationNotice({
    icon,
    text,
}: {
    icon: ReactNode;
    text: string;
}) {
    return (
        <div className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
            {icon}
            {text}
        </div>
    );
}

function ChatMemberProfileStateDialog({
    isLoading,
    hasError,
    loadingText,
    errorTitle,
    retryLabel,
    closeLabel,
    onRetry,
    onClose,
}: {
    isLoading: boolean;
    hasError: boolean;
    loadingText: string;
    errorTitle: string;
    retryLabel: string;
    closeLabel: string;
    onRetry: () => Promise<boolean>;
    onClose: () => void;
}) {
    const closeButtonRef =
        useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const focusTimer = window.setTimeout(() => {
            closeButtonRef.current?.focus();
        }, 0);

        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            window.clearTimeout(focusTimer);
            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [onClose]);

    if (typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
            onMouseDown={onClose}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="chat-member-profile-state-title"
                className="relative w-full max-w-sm rounded-3xl border border-white/20 bg-white p-6 text-center shadow-2xl dark:border-white/10 dark:bg-slate-950"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    aria-label={closeLabel}
                    className="absolute right-3 top-3 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-white/10 dark:hover:text-white"
                >
                    <X
                        className="h-4 w-4"
                        aria-hidden="true"
                    />
                </button>

                {isLoading ? (
                    <>
                        <Loader2
                            className="mx-auto h-9 w-9 animate-spin text-orange-500"
                            aria-hidden="true"
                        />
                        <h2
                            id="chat-member-profile-state-title"
                            className="mt-4 text-base font-black text-slate-900 dark:text-white"
                        >
                            {loadingText}
                        </h2>
                    </>
                ) : (
                    <>
                        <AlertCircle
                            className="mx-auto h-9 w-9 text-rose-500"
                            aria-hidden="true"
                        />
                        <h2
                            id="chat-member-profile-state-title"
                            className="mt-4 text-lg font-black text-slate-900 dark:text-white"
                        >
                            {errorTitle}
                        </h2>

                        {hasError && (
                            <button
                                type="button"
                                onClick={() =>
                                    void onRetry()
                                }
                                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:text-slate-950"
                            >
                                <RefreshCw
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                                {retryLabel}
                            </button>
                        )}
                    </>
                )}
            </section>
        </div>,
        document.body,
    );
}
