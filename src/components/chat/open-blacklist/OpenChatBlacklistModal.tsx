"use client";

import { Search, ShieldAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import type { FormEvent, RefObject } from "react";

import { OpenChatBlacklistContent } from "@/components/chat/open-blacklist/OpenChatBlacklistContent";
import type { OpenChatBlacklistErrorCode } from "@/hooks/chat/useOpenChatBlacklist";
import type { OpenChatBanListItem } from "@/types/chat";

interface OpenChatBlacklistModalProps {
    isOpen: boolean;
    modalRef: RefObject<HTMLElement | null>;
    roomName: string;
    items: OpenChatBanListItem[];
    keywordInput: string;
    appliedKeyword: string | null;
    isLoading: boolean;
    isLoadingMore: boolean;
    hasNext: boolean;
    loadErrorCode: OpenChatBlacklistErrorCode | null;
    formatDate: (value: string) => string;
    onClose: () => void;
    onKeywordChange: (value: string) => void;
    onClearSearch: () => void;
    onSubmitSearch: (event: FormEvent<HTMLFormElement>) => void;
    onRetry: () => void;
    onLoadMore: () => void;
    onOpenRelease: (item: OpenChatBanListItem) => void;
}

export function OpenChatBlacklistModal({
    isOpen,
    modalRef,
    roomName,
    items,
    keywordInput,
    appliedKeyword,
    isLoading,
    isLoadingMore,
    hasNext,
    loadErrorCode,
    formatDate,
    onClose,
    onKeywordChange,
    onClearSearch,
    onSubmitSearch,
    onRetry,
    onLoadMore,
    onOpenRelease,
}: OpenChatBlacklistModalProps) {
    const t = useTranslations("OpenChatBlacklist");

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={onClose}
            data-testid="open-chat-blacklist-overlay"
        >
            <section
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="open-chat-blacklist-title"
                onMouseDown={(event) => event.stopPropagation()}
                data-testid="open-chat-blacklist-modal"
                className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-50 shadow-2xl dark:bg-slate-950 sm:max-h-[calc(100dvh-3rem)]"
            >
                <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-5 dark:border-white/10 dark:bg-slate-900 sm:px-7">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-200">
                                <ShieldAlert
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
                                    {t("eyebrow")}
                                </p>
                                <h2
                                    id="open-chat-blacklist-title"
                                    className="mt-1 text-2xl font-black text-slate-950 dark:text-white"
                                >
                                    {t("title")}
                                </h2>
                                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                                    {t("description", { roomName })}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            data-testid="open-chat-blacklist-close"
                            onClick={onClose}
                            aria-label={t("close")}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>

                    <form
                        onSubmit={onSubmitSearch}
                        className="mt-5 flex flex-col gap-2 sm:flex-row"
                    >
                        <label
                            htmlFor="open-chat-blacklist-search"
                            className="sr-only"
                        >
                            {t("search.label")}
                        </label>
                        <div className="relative min-w-0 flex-1">
                            <Search
                                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                aria-hidden="true"
                            />
                            <input
                                id="open-chat-blacklist-search"
                                data-testid="open-chat-blacklist-search"
                                value={keywordInput}
                                maxLength={100}
                                onChange={(event) =>
                                    onKeywordChange(event.target.value)
                                }
                                placeholder={t("search.placeholder")}
                                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:ring-violet-400/20"
                            />
                            {keywordInput && (
                                <button
                                    type="button"
                                    onClick={onClearSearch}
                                    aria-label={t("search.clear")}
                                    className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                                >
                                    <X
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            data-testid="open-chat-blacklist-search-submit"
                            className="min-h-12 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700"
                        >
                            {t("search.submit")}
                        </button>
                    </form>
                </header>

                <div className="custom-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-7">
                    <OpenChatBlacklistContent
                        items={items}
                        appliedKeyword={appliedKeyword}
                        isLoading={isLoading}
                        isLoadingMore={isLoadingMore}
                        hasNext={hasNext}
                        loadErrorCode={loadErrorCode}
                        formatDate={formatDate}
                        onRetry={onRetry}
                        onLoadMore={onLoadMore}
                        onOpenRelease={onOpenRelease}
                    />
                </div>
            </section>
        </div>,
        document.body,
    );
}
