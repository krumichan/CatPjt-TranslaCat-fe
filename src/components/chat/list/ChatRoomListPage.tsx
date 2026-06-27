"use client";

import { AlertCircle, Loader2, MessageCircle, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChatRoomEmptyState } from "@/components/chat/list/ChatRoomEmptyState";
import { ChatRoomList } from "@/components/chat/list/ChatRoomList";
import { useChatRooms } from "@/hooks/chat/useChatRooms";

export function ChatRoomListPage() {
    const t = useTranslations("ChatRoomList");

    const {
        rooms,
        isLoading,
        loadErrorCode,
        reload,
    } = useChatRooms();

    return (
        <main className="min-h-[calc(100vh-3.75rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                                <MessageCircle className="h-3.5 w-3.5" />
                                {t("badge")}
                            </div>

                            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {t("title")}
                            </h1>

                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                {t("description")}
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            title={t("create.comingSoon")}
                        >
                            <Plus className="h-4 w-4" />
                            {t("create.button")}
                        </button>
                    </div>
                </section>

                {isLoading ? (
                    <section className="flex min-h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>{t("loading")}</span>
                        </div>
                    </section>
                ) : loadErrorCode ? (
                    <section className="flex min-h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="w-full max-w-md text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-300">
                                <AlertCircle className="h-6 w-6" />
                            </div>

                            <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                                {t("error.title")}
                            </h2>

                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                {t("error.loadFailed")}
                            </p>

                            <button
                                type="button"
                                onClick={() => void reload()}
                                className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                                {t("error.retry")}
                            </button>
                        </div>
                    </section>
                ) : rooms.length === 0 ? (
                    <ChatRoomEmptyState />
                ) : (
                    <ChatRoomList rooms={rooms} />
                )}
            </div>
        </main>
    );
}