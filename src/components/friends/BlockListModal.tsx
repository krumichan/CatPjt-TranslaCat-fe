"use client";

import { createPortal } from "react-dom";
import { useEffect } from "react";
import { Ban, Loader2, ShieldCheck, UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";

import type { UserBlock } from "@/types/social";

type BlockListModalProps = {
    isOpen: boolean;
    blocks: UserBlock[];
    isLoading: boolean;
    unblockingUserId: number | null;
    onClose: () => void;
    onUnblock: (blockedUserId: number) => Promise<boolean>;
};

export default function BlockListModal({
    isOpen,
    blocks,
    isLoading,
    unblockingUserId,
    onClose,
    onUnblock,
}: BlockListModalProps) {
    const t = useTranslations("Social.friendListPage.blockListModal");

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && unblockingUserId === null) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose, unblockingUserId]);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm dark:bg-black/60"
            role="presentation"
            onClick={() => {
                if (unblockingUserId === null) {
                    onClose();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                className="max-h-[min(760px,calc(100vh-48px))] w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-white"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-4 p-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-500">
                            {t("eyebrow")}
                        </p>
                        <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                            {t("title")}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {t("description")}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={unblockingUserId !== null}
                        aria-label={t("close")}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </header>

                <div className="max-h-[calc(100vh-260px)] overflow-y-auto border-t border-slate-200 p-5 dark:border-white/10">
                    {isLoading ? (
                        <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                            {t("loading")}
                        </div>
                    ) : blocks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center dark:border-white/10 dark:bg-white/5">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-300">
                                <Ban className="h-7 w-7" aria-hidden="true" />
                            </div>
                            <p className="mt-4 text-base font-black text-slate-950 dark:text-white">
                                {t("emptyTitle")}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                {t("emptyDescription")}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {blocks.map((block) => {
                                const isUnblocking =
                                    unblockingUserId === block.blockedUserId;

                                return (
                                    <article
                                        key={block.blockedUserId}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-200">
                                                    {block.blockedProfileImageUrl ? (
                                                        // TODO: TranslaCat 이미지 업로드 방식 전환 시 next/image 적용 검토
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={
                                                                block.blockedProfileImageUrl
                                                            }
                                                            alt={
                                                                block.blockedNickname
                                                            }
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <UserRound
                                                            className="h-7 w-7"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="truncate text-base font-black text-slate-950 dark:text-white">
                                                        {
                                                            block.blockedNickname
                                                        }
                                                    </p>
                                                    <code className="mt-1 inline-flex max-w-full rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-white/10">
                                                        <span className="truncate">
                                                            {
                                                                block.blockedPublicId
                                                            }
                                                        </span>
                                                    </code>
                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {t("blockedAt", {
                                                            date: block.blockedAt,
                                                        })}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onUnblock(
                                                        block.blockedUserId,
                                                    )
                                                }
                                                disabled={
                                                    unblockingUserId !== null
                                                }
                                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                                            >
                                                {isUnblocking ? (
                                                    <Loader2
                                                        className="h-4 w-4 animate-spin"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <ShieldCheck
                                                        className="h-4 w-4"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                {isUnblocking
                                                    ? t("unblocking")
                                                    : t("unblock")}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </div>,
        document.body,
    );
}
