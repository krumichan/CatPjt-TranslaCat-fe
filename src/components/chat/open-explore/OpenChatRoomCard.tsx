"use client";

import {
    ArrowRight,
    Clock3,
    Globe2,
    LockKeyhole,
    Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ChatAiDisclosureBadge } from "@/components/chat/ai/ChatAiDisclosureBadge";
import { OpenChatAvatar } from "@/components/chat/open-profile/OpenChatAvatar";
import { Link } from "@/navigation";
import type { OpenChatRoomListItem } from "@/types/chat";

interface OpenChatRoomCardProps {
    room: OpenChatRoomListItem;
}

export function OpenChatRoomCard({ room }: OpenChatRoomCardProps) {
    const t = useTranslations("OpenChatExplore");
    const locale = useLocale();
    const isFull =
        room.joinBlockedReason === "ROOM_FULL" ||
        room.memberCount >= room.maxMemberCount;
    const isBanned = room.joinBlockedReason === "BANNED";
    const activityLabel = new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(room.lastActivityAt));

    return (
        <article
            data-testid={`open-chat-room-card-${room.id}`}
            className="flex min-h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-400/30"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-200">
                    <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("visibility.PUBLIC")}
                </div>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                        room.joined
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200"
                            : isFull || isBanned
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200"
                              : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200"
                    }`}
                >
                    {room.joined
                        ? t("status.joined")
                        : isBanned
                          ? t("status.banned")
                          : isFull
                            ? t("status.full")
                            : t("status.joinable")}
                </span>
            </div>

            {room.ai?.aiEnabled && (
                <div className="mt-4">
                    <ChatAiDisclosureBadge
                        aiEnabled={room.ai.aiEnabled}
                        disclosureType={room.ai.disclosureType}
                        aiMemberCount={room.ai.aiMemberCount}
                    />
                </div>
            )}

            <h2 className="mt-4 line-clamp-2 text-xl font-black text-slate-950 dark:text-white">
                {room.name}
            </h2>
            <p className="mt-2 line-clamp-3 min-h-15 text-sm leading-6 text-slate-500 dark:text-slate-300">
                {room.description}
            </p>

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
                <OpenChatAvatar
                    profileImageUrl={room.ownerProfile.profileImageUrl}
                    alt={room.ownerProfile.nickname}
                    size="sm"
                />
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        {t("owner")}
                    </p>
                    <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">
                        {room.ownerProfile.nickname}
                    </p>
                </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-slate-200 p-3 dark:border-white/10">
                    <dt className="flex items-center gap-1 font-bold text-slate-400">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("members")}
                    </dt>
                    <dd className="mt-1 font-black text-slate-700 dark:text-slate-200">
                        {room.memberCount} / {room.maxMemberCount}
                    </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 p-3 dark:border-white/10">
                    <dt className="flex items-center gap-1 font-bold text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("lastActivity")}
                    </dt>
                    <dd className="mt-1 truncate font-black text-slate-700 dark:text-slate-200">
                        {activityLabel}
                    </dd>
                </div>
            </dl>

            <Link
                href={`/chat/open/${room.id}`}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950 dark:hover:bg-orange-300 dark:focus-visible:ring-offset-slate-900"
                aria-label={t("openDetail", { name: room.name })}
            >
                {room.joined ? t("enter") : t("detail")}
                {isFull && !room.joined ? (
                    <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                ) : (
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                )}
            </Link>
        </article>
    );
}
