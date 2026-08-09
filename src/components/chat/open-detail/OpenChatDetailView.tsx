"use client";

import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Ban,
    Clock3,
    Globe2,
    Link2,
    Loader2,
    LockKeyhole,
    RefreshCw,
    Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ChatAiDisclosureBadge } from "@/components/chat/ai/ChatAiDisclosureBadge";
import { ChatAiPolicyNotice } from "@/components/chat/ai/ChatAiPolicyNotice";
import { OpenChatAvatar } from "@/components/chat/open-profile/OpenChatAvatar";
import type { OpenChatRoomDetailLoadErrorCode } from "@/hooks/chat/useOpenChatRoomDetail";
import { Link } from "@/navigation";
import type { OpenChatRoomDetail } from "@/types/chat";

interface OpenChatDetailViewProps {
    room: OpenChatRoomDetail | null;
    showBannedNotice?: boolean;
    isLoading: boolean;
    loadErrorCode: OpenChatRoomDetailLoadErrorCode | null;
    onRetry: () => Promise<OpenChatRoomDetail | null>;
    onOpenJoin: () => void;
}

function StatusIcon({ reason }: { reason: OpenChatRoomDetail["joinBlockedReason"] }) {
    if (reason === "BANNED") {
        return <Ban className="h-6 w-6" aria-hidden="true" />;
    }
    if (reason === "ROOM_FULL" || reason === "ROOM_CLOSED") {
        return <LockKeyhole className="h-6 w-6" aria-hidden="true" />;
    }
    return <ArrowRight className="h-6 w-6" aria-hidden="true" />;
}

export function OpenChatDetailView({
    room,
    showBannedNotice = false,
    isLoading,
    loadErrorCode,
    onRetry,
    onOpenJoin,
}: OpenChatDetailViewProps) {
    const t = useTranslations("OpenChatDetail");
    const locale = useLocale();

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-orange-500" aria-hidden="true" />
                <span className="text-sm font-bold text-slate-500 dark:text-slate-300">
                    {t("loading")}
                </span>
            </main>
        );
    }

    if (loadErrorCode || !room) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
                <section className="w-full max-w-lg rounded-4xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-400/30 dark:bg-slate-900">
                    <AlertCircle className="mx-auto h-10 w-10 text-rose-500" aria-hidden="true" />
                    <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
                        {loadErrorCode === "NOT_FOUND"
                            ? t("error.notFoundTitle")
                            : t("error.title")}
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                        {loadErrorCode === "NOT_FOUND"
                            ? t("error.notFoundDescription")
                            : t("error.description")}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        <Link
                            href="/chat/open"
                            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 dark:border-white/10 dark:text-slate-200"
                        >
                            {t("backToExplore")}
                        </Link>
                        {loadErrorCode !== "NOT_FOUND" && (
                            <button
                                type="button"
                                onClick={() => void onRetry()}
                                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-black text-white"
                            >
                                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                {t("error.retry")}
                            </button>
                        )}
                    </div>
                </section>
            </main>
        );
    }

    const activityLabel = new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(room.lastActivityAt));
    const visibilityIcon =
        room.visibility === "PUBLIC" ? Globe2 : Link2;
    const VisibilityIcon = visibilityIcon;
    const isBlocked =
        room.joinBlockedReason === "ROOM_FULL" ||
        room.joinBlockedReason === "ROOM_CLOSED" ||
        room.joinBlockedReason === "BANNED";

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
            <div className="mx-auto w-full max-w-5xl pt-20">
                <Link
                    href="/chat/open"
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:border-orange-200 hover:text-orange-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t("backToExplore")}
                </Link>

                {showBannedNotice && (
                    <div
                        role="alert"
                        data-testid="open-chat-banned-notice"
                        className="mt-5 flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                    >
                        <Ban className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                        <span>{t("bannedNotice")}</span>
                    </div>
                )}

                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <section className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-200">
                                <VisibilityIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                {t(`visibility.${room.visibility}`)}
                            </span>
                            {room.joined && (
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200">
                                    {t("status.joined")}
                                </span>
                            )}
                            {room.ai?.aiEnabled && (
                                <ChatAiDisclosureBadge
                                    aiEnabled={room.ai.aiEnabled}
                                    disclosureType={room.ai.disclosureType}
                                    aiMemberCount={room.ai.aiMemberCount}
                                />
                            )}
                        </div>

                        <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                            {room.name}
                        </h1>
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-500 dark:text-slate-300">
                            {room.description}
                        </p>

                        {room.ai?.aiEnabled && room.ai.disclosureType && (
                            <div className="mt-6">
                                <ChatAiPolicyNotice
                                    aiEnabled={room.ai.aiEnabled}
                                    disclosureType={room.ai.disclosureType}
                                />
                            </div>
                        )}

                        <dl className="mt-7 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-3xl bg-slate-50 p-4 dark:bg-white/5">
                                <dt className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                    <Users className="h-4 w-4" aria-hidden="true" />
                                    {t("members")}
                                </dt>
                                <dd className="mt-2 text-lg font-black text-slate-800 dark:text-slate-100">
                                    {room.memberCount} / {room.maxMemberCount}
                                </dd>
                            </div>
                            <div className="rounded-3xl bg-slate-50 p-4 dark:bg-white/5">
                                <dt className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                                    {t("lastActivity")}
                                </dt>
                                <dd className="mt-2 text-sm font-black text-slate-800 dark:text-slate-100">
                                    {activityLabel}
                                </dd>
                            </div>
                        </dl>

                        {room.ownerProfile && (
                            <section className="mt-7 rounded-3xl border border-orange-200 bg-orange-50/70 p-5 dark:border-orange-400/20 dark:bg-orange-500/10">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">
                                    {t("owner.eyebrow")}
                                </p>
                                <div className="mt-3 flex items-center gap-4">
                                    <OpenChatAvatar
                                        profileImageUrl={
                                            room.ownerProfile.profileImageUrl
                                        }
                                        alt={room.ownerProfile.nickname}
                                        size="lg"
                                    />
                                    <div className="min-w-0">
                                        <h2 className="truncate text-xl font-black text-slate-900 dark:text-white">
                                            {room.ownerProfile.nickname}
                                        </h2>
                                        <p className="mt-1 text-sm text-orange-600 dark:text-orange-100">
                                            {t("owner.description")}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}
                    </section>

                    <aside className="h-fit rounded-4xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isBlocked ? "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300" : "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-200"}`}>
                            <StatusIcon reason={room.joinBlockedReason} />
                        </div>
                        <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
                            {room.joined
                                ? t("action.joinedTitle")
                                : t(`action.${room.joinBlockedReason}.title`)}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                            {room.joined
                                ? t("action.joinedDescription")
                                : t(`action.${room.joinBlockedReason}.description`)}
                        </p>

                        {room.joined ? (
                            <Link
                                href={`/chat/rooms/${room.id}`}
                                data-testid="open-chat-enter-room"
                                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300"
                            >
                                {t("action.enter")}
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        ) : room.joinable ? (
                            <button
                                type="button"
                                data-testid="open-chat-join-button"
                                onClick={onOpenJoin}
                                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300 dark:focus-visible:ring-offset-slate-900"
                            >
                                {room.myOpenProfile
                                    ? t("action.rejoin")
                                    : t("action.join")}
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        ) : (
                            <div
                                role="status"
                                data-testid={`open-chat-blocked-${room.joinBlockedReason}`}
                                className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-black text-slate-500 dark:bg-white/5 dark:text-slate-300"
                            >
                                {t(`action.${room.joinBlockedReason}.label`)}
                            </div>
                        )}

                        <p className="mt-4 text-xs leading-5 text-slate-400">
                            {t("privacyNotice")}
                        </p>
                    </aside>
                </div>
            </div>
        </main>
    );
}
