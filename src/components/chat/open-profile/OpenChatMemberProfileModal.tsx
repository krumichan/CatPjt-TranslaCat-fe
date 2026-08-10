"use client";

import {
    AlertCircle,
    CalendarDays,
    Check,
    Clipboard,
    Loader2,
    RefreshCw,
    X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
    useCallback,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { ChatPresenceIndicator } from "@/components/chat/common/ChatPresenceIndicator";
import { OpenChatAvatar } from "@/components/chat/open-profile/OpenChatAvatar";
import { OpenChatRoleBadge } from "@/components/chat/open-moderation/OpenChatRoleBadge";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import type { OpenChatMemberProfile } from "@/types/chat";

interface OpenChatMemberProfileModalProps {
    isOpen: boolean;
    profile: OpenChatMemberProfile | null;
    isLoading: boolean;
    loadErrorCode: string | null;
    actionSlot?: ReactNode;
    onRetry: () => Promise<boolean>;
    onClose: () => void;
    showPresence?: boolean;
}

export function OpenChatMemberProfileModal({
    isOpen,
    profile,
    isLoading,
    loadErrorCode,
    actionSlot,
    onRetry,
    onClose,
    showPresence = true,
}: OpenChatMemberProfileModalProps) {
    const t = useTranslations("ChatRoom.openProfile");
    const locale = useLocale();
    const dialogRef = useRef<HTMLElement>(null);
    const [copied, setCopied] = useState(false);

    const close = useCallback(() => {
        setCopied(false);
        onClose();
    }, [onClose]);

    useModalFocusTrap(isOpen, dialogRef, close);

    const copyMemberCode = useCallback(async () => {
        if (!profile) {
            return;
        }
        try {
            await navigator.clipboard.writeText(profile.memberCode);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch (error) {
            console.error("Failed to copy OPEN member code.", error);
            setCopied(false);
        }
    }, [profile]);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    const joinedAt = profile
        ? new Intl.DateTimeFormat(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          }).format(new Date(profile.joinedAt))
        : "";

    return createPortal(
        <div
            className="fixed inset-0 z-1250 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
            onMouseDown={close}
            data-testid="open-chat-member-profile-overlay"
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={profile?.nickname ?? t("modal.title")}
                onMouseDown={(event) => event.stopPropagation()}
                className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-6 text-center shadow-2xl dark:bg-slate-950"
                data-testid="open-chat-member-profile-modal"
            >
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={close}
                        aria-label={t("modal.close")}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="py-12">
                        <Loader2 className="mx-auto h-9 w-9 animate-spin text-orange-500" aria-hidden="true" />
                        <p className="mt-4 font-black text-slate-700 dark:text-slate-200">
                            {t("modal.loading")}
                        </p>
                    </div>
                ) : loadErrorCode || !profile ? (
                    <div className="py-8">
                        <AlertCircle className="mx-auto h-10 w-10 text-rose-500" aria-hidden="true" />
                        <p className="mt-4 font-black text-slate-800 dark:text-white">
                            {t("modal.loadFailed")}
                        </p>
                        <button
                            type="button"
                            onClick={() => void onRetry()}
                            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 dark:bg-orange-400 dark:text-slate-950"
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            {t("modal.retry")}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-center">
                            <OpenChatAvatar
                                profileImageUrl={profile.profileImageUrl}
                                alt={t("modal.profileAlt", {
                                    nickname: profile.nickname,
                                })}
                                size="lg"
                            />
                        </div>

                        <div className="mt-5 flex items-center justify-center gap-2">
                            <h2
                                className="text-2xl font-black text-slate-900 dark:text-white"
                            >
                                {profile.nickname}
                            </h2>
                            {showPresence && (
                                <ChatPresenceIndicator
                                    online={profile.online}
                                    testId={`chat-open-member-profile-presence-${profile.openChatMemberId}`}
                                    className="h-3 w-3"
                                />
                            )}
                            <OpenChatRoleBadge role={profile.role} />
                        </div>

                        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                {t("modal.memberCode")}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <code
                                    data-testid="open-chat-member-code"
                                    className="min-w-0 flex-1 truncate rounded-xl bg-white px-3 py-2 font-mono text-sm font-black tracking-wider text-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                >
                                    {profile.memberCode}
                                </code>
                                <button
                                    type="button"
                                    onClick={() => void copyMemberCode()}
                                    aria-label={t("modal.copyMemberCode")}
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-orange-300 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-white/10 dark:text-slate-300"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4" aria-hidden="true" />
                                    ) : (
                                        <Clipboard className="h-4 w-4" aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                            <span className="sr-only" role="status" aria-live="polite">
                                {copied ? t("modal.copied") : ""}
                            </span>

                            <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-300">
                                <CalendarDays className="h-4 w-4 text-orange-500" aria-hidden="true" />
                                {t("modal.joinedAt", { date: joinedAt })}
                            </p>
                        </div>

                        {actionSlot && (
                            <div data-testid="open-chat-profile-action-slot" className="mt-5">
                                {actionSlot}
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>,
        document.body,
    );
}
