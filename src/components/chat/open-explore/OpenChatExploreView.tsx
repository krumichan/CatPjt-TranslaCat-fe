"use client";

import {
    AlertCircle,
    Globe2,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { OpenChatRoomCard } from "@/components/chat/open-explore/OpenChatRoomCard";
import type { useOpenChatRooms } from "@/hooks/chat/useOpenChatRooms";
import { Link } from "@/navigation";

type OpenChatExploreController = ReturnType<typeof useOpenChatRooms>;

interface OpenChatExploreViewProps {
    controller: OpenChatExploreController;
}

export function OpenChatExploreView({
    controller,
}: OpenChatExploreViewProps) {
    const t = useTranslations("OpenChatExplore");
    const {
        keyword,
        rooms,
        isLoading,
        isLoadingMore,
        isDebouncing,
        hasNext,
        loadErrorCode,
        loadMoreErrorCode,
        updateKeyword,
        clearKeyword,
        reload,
        loadMore,
    } = controller;

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pt-20">
                <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-200">
                                <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                                {t("badge")}
                            </div>
                            <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
                                {t("title")}
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-300">
                                {t("description")}
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                            <Link
                                href="/chat"
                                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 transition hover:border-orange-200 hover:text-orange-500 dark:border-white/10 dark:text-slate-200"
                            >
                                {t("backToChat")}
                            </Link>
                            <Link
                                href="/chat/open/new"
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-600 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300"
                            >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                {t("create")}
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                    <label
                        htmlFor="open-chat-search"
                        className="text-sm font-black text-slate-800 dark:text-slate-100"
                    >
                        {t("search.label")}
                    </label>
                    <div className="relative mt-2">
                        <Search
                            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                            aria-hidden="true"
                        />
                        <input
                            id="open-chat-search"
                            value={keyword}
                            maxLength={100}
                            autoComplete="off"
                            onChange={(event) =>
                                updateKeyword(event.target.value)
                            }
                            placeholder={t("search.placeholder")}
                            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:ring-orange-500/10"
                        />
                        {keyword && (
                            <button
                                type="button"
                                onClick={clearKeyword}
                                aria-label={t("search.clear")}
                                className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                    <p className="mt-2 min-h-5 text-xs font-semibold text-slate-400" aria-live="polite">
                        {isDebouncing ? t("search.searching") : t("search.help")}
                    </p>
                </section>

                {isLoading ? (
                    <section className="flex min-h-72 items-center justify-center rounded-[2rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin text-orange-500" aria-hidden="true" />
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-300">
                            {t("loading")}
                        </span>
                    </section>
                ) : loadErrorCode ? (
                    <section className="flex min-h-72 flex-col items-center justify-center rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-400/30 dark:bg-rose-500/10">
                        <AlertCircle className="h-10 w-10 text-rose-500" aria-hidden="true" />
                        <h2 className="mt-4 text-lg font-black text-rose-700 dark:text-rose-100">
                            {t("error.title")}
                        </h2>
                        <p className="mt-2 text-sm text-rose-600 dark:text-rose-200">
                            {t("error.description")}
                        </p>
                        <button
                            type="button"
                            onClick={() => void reload()}
                            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-600"
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            {t("error.retry")}
                        </button>
                    </section>
                ) : rooms.length === 0 ? (
                    <section className="flex min-h-72 flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white p-6 text-center dark:border-white/15 dark:bg-slate-900">
                        <Search className="h-10 w-10 text-slate-300" aria-hidden="true" />
                        <h2 className="mt-4 text-lg font-black text-slate-800 dark:text-slate-100">
                            {keyword.trim() ? t("empty.searchTitle") : t("empty.title")}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {keyword.trim() ? t("empty.searchDescription") : t("empty.description")}
                        </p>
                    </section>
                ) : (
                    <>
                        <section
                            aria-label={t("listLabel")}
                            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                        >
                            {rooms.map((room) => (
                                <OpenChatRoomCard key={room.id} room={room} />
                            ))}
                        </section>

                        {hasNext && (
                            <div className="flex flex-col items-center gap-3">
                                {loadMoreErrorCode && (
                                    <p role="alert" className="text-sm font-bold text-rose-500">
                                        {t("loadMoreFailed")}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    data-testid="open-chat-load-more"
                                    disabled={isLoadingMore}
                                    onClick={() => void loadMore()}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-500 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                                >
                                    {isLoadingMore && (
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    )}
                                    {isLoadingMore ? t("loadingMore") : t("loadMore")}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
