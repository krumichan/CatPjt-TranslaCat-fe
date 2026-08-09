"use client";

import {
    AlertCircle,
    Bot,
    Languages,
    Loader2,
    RefreshCw,
    UserRound,
    X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { createPortal } from "react-dom";

import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import type {
    ChatAiDisclosureType,
    ChatAiSafeProfile,
} from "@/types/chat";

interface ChatAiMemberProfileModalProps {
    isOpen: boolean;
    profile: ChatAiSafeProfile | null;
    disclosureType: ChatAiDisclosureType | null;
    isLoading: boolean;
    loadErrorCode: string | null;
    onRetry: () => Promise<boolean>;
    onClose: () => void;
}

export function ChatAiMemberProfileModal({
    isOpen,
    profile,
    disclosureType,
    isLoading,
    loadErrorCode,
    onRetry,
    onClose,
}: ChatAiMemberProfileModalProps) {
    const t = useTranslations("ChatAi.profile");
    const dialogRef = useRef<HTMLElement>(null);

    useModalFocusTrap(isOpen, dialogRef, onClose);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    const isPublic = disclosureType === "PUBLIC";

    return createPortal(
        <div
            className="fixed inset-0 z-1250 flex items-start justify-center overflow-y-auto bg-slate-950/65 px-4 py-6 backdrop-blur-sm sm:items-center sm:py-10"
            onMouseDown={onClose}
            data-testid="chat-ai-profile-overlay"
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={profile?.nickname ?? t("title")}
                onMouseDown={(event) => event.stopPropagation()}
                className="relative flex w-full max-w-md flex-col overflow-hidden rounded-4xl border border-white/15 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950"
                data-testid="chat-ai-profile-modal"
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t("close")}
                    className="absolute right-4 top-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/60 text-white shadow-sm backdrop-blur-sm transition hover:bg-slate-950/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>

                {isLoading ? (
                    <div className="px-6 py-16 text-center">
                        <Loader2
                            className="mx-auto h-9 w-9 animate-spin text-violet-500"
                            aria-hidden="true"
                        />
                        <p className="mt-4 font-black text-slate-700 dark:text-slate-200">
                            {t("loading")}
                        </p>
                    </div>
                ) : loadErrorCode || !profile ? (
                    <div className="px-6 py-14 text-center">
                        <AlertCircle
                            className="mx-auto h-10 w-10 text-rose-500"
                            aria-hidden="true"
                        />
                        <p className="mt-4 font-black text-slate-800 dark:text-white">
                            {t("loadFailed")}
                        </p>
                        <button
                            type="button"
                            onClick={() => void onRetry()}
                            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700 dark:bg-violet-400 dark:text-slate-950"
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            {t("retry")}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="relative h-44 overflow-hidden bg-linear-to-br from-violet-100 via-sky-50 to-orange-50 dark:from-violet-500/20 dark:via-slate-900 dark:to-orange-500/10">
                            {profile.profileBackgroundImageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={profile.profileBackgroundImageUrl}
                                    alt=""
                                    className="absolute inset-0 h-full w-full object-cover object-center"
                                />
                            )}
                            <div className="absolute inset-0 bg-linear-to-b from-black/5 via-transparent to-black/25" />
                        </div>

                        <div className="relative px-6 pb-7">
                            <div className="-mt-14 flex flex-col items-center">
                                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 text-slate-500 shadow-xl dark:border-slate-950 dark:bg-slate-800 dark:text-slate-300">
                                    <UserRound
                                        className="h-12 w-12"
                                        aria-hidden="true"
                                    />
                                    {profile.profileImageUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={profile.profileImageUrl}
                                            alt={t("profileAlt", {
                                                nickname: profile.nickname,
                                            })}
                                            className="absolute inset-0 h-full w-full object-cover object-center"
                                            onError={(event) => {
                                                event.currentTarget.style.display =
                                                    "none";
                                            }}
                                        />
                                    )}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                    <h2 className="text-center text-2xl font-black text-slate-900 dark:text-white">
                                        {profile.nickname}
                                    </h2>
                                    {isPublic && (
                                        <span
                                            data-testid="chat-ai-profile-badge"
                                            className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200"
                                        >
                                            <Bot
                                                className="h-3 w-3"
                                                aria-hidden="true"
                                            />
                                            {t("aiBadge")}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                    {t("bio")}
                                </p>
                                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    {profile.bio?.trim() || t("emptyBio")}
                                </p>
                            </div>

                            {isPublic && (
                                <div
                                    data-testid="chat-ai-profile-language"
                                    className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 dark:border-white/10 dark:text-slate-300"
                                >
                                    <Languages
                                        className="h-4 w-4 shrink-0 text-violet-500"
                                        aria-hidden="true"
                                    />
                                    <span>{t("originalLanguage")}</span>
                                    <code className="ml-auto rounded-lg bg-slate-100 px-2 py-1 text-xs font-black uppercase text-slate-700 dark:bg-white/10 dark:text-slate-100">
                                        {profile.originalLanguageCode}
                                    </code>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </section>
        </div>,
        document.body,
    );
}
