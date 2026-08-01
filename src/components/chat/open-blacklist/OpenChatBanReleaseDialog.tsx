"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import type { RefObject } from "react";

import type { OpenChatBanReleaseErrorCode } from "@/hooks/chat/useOpenChatBlacklist";
import type { OpenChatBanListItem } from "@/types/chat";

interface OpenChatBanReleaseDialogProps {
    dialogRef: RefObject<HTMLElement | null>;
    selectedBan: OpenChatBanListItem | null;
    isReleasing: boolean;
    errorCode: OpenChatBanReleaseErrorCode | null;
    onClose: () => void;
    onRelease: () => void;
}

export function OpenChatBanReleaseDialog({
    dialogRef,
    selectedBan,
    isReleasing,
    errorCode,
    onClose,
    onRelease,
}: OpenChatBanReleaseDialogProps) {
    const t = useTranslations("OpenChatBlacklist");

    if (!selectedBan || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            onMouseDown={onClose}
            data-testid="open-chat-ban-release-overlay"
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="open-chat-ban-release-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-950"
            >
                <h2
                    id="open-chat-ban-release-title"
                    className="text-xl font-black text-slate-900 dark:text-white"
                >
                    {t("releaseDialog.title")}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">
                    {t("releaseDialog.description", {
                        nickname: selectedBan.nickname,
                    })}
                </p>
                <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                    {t("releaseDialog.noAutoJoin")}
                </p>
                {errorCode && (
                    <p
                        role="alert"
                        className="mt-4 text-sm font-bold text-rose-500"
                    >
                        {t(`releaseDialog.errors.${errorCode}`)}
                    </p>
                )}
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        disabled={isReleasing}
                        onClick={onClose}
                        className="min-h-11 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 dark:border-white/10 dark:text-slate-200"
                    >
                        {t("releaseDialog.cancel")}
                    </button>
                    <button
                        type="button"
                        data-testid="open-chat-ban-release-confirm"
                        disabled={isReleasing}
                        onClick={onRelease}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                    >
                        {isReleasing && (
                            <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {t("releaseDialog.confirm")}
                    </button>
                </div>
            </section>
        </div>,
        document.body,
    );
}
