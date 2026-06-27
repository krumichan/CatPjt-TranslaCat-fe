"use client";

import { ChevronRight, Languages, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { ChatRoom, ChatRoomType } from "@/types/chat";

interface ChatRoomListItemProps {
    room: ChatRoom;
}

const getRoomTypeTranslationKey = (roomType: ChatRoomType) => {
    switch (roomType) {
        case "DIRECT":
            return "roomType.direct";
        case "GROUP":
            return "roomType.group";
        case "OPEN":
            return "roomType.open";
        default:
            return "roomType.unknown";
    }
};

const formatUpdatedAt = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));

export function ChatRoomListItem({ room }: ChatRoomListItemProps) {
    const t = useTranslations("ChatRoomList");

    return (
        <Link
            href={`/chat/rooms/${room.id}`}
            className="group block rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900/70"
        >
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                    {room.roomType === "GROUP" ? (
                        <Users className="h-5 w-5" />
                    ) : (
                        <MessageCircle className="h-5 w-5" />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                                {room.name || t("untitledRoom")}
                            </h2>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {t(getRoomTypeTranslationKey(room.roomType))}
                                </span>

                                <span className="inline-flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5" />
                                    {t("members.count", { count: room.memberCount })}
                                </span>

                                <span>Room #{room.id}</span>

                                <span>{formatUpdatedAt(room.updatedAt)}</span>
                            </div>
                        </div>

                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-600" />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 dark:bg-slate-950">
                            <Languages className="h-3.5 w-3.5" />
                            {room.originalLanguageCode.toUpperCase()} →{" "}
                            {room.translationLanguageCode.toUpperCase()}
                        </span>

                        {room.description && (
                            <span className="line-clamp-1 min-w-0 flex-1">
                                {room.description}
                            </span>
                        )}
                    </div>

                    <p className="mt-3 line-clamp-1 text-sm text-slate-400 dark:text-slate-500">
                        {t("latestMessage.placeholder")}
                    </p>
                </div>
            </div>
        </Link>
    );
}