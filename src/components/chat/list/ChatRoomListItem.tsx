"use client";

import { ChevronRight, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ChatRoomAvatar } from "@/components/chat/common/ChatRoomAvatar";
import type {
    ChatRoomListItem as ChatRoomListItemType,
    ChatRoomSourceType,
    ChatRoomType,
} from "@/types/chat";
import { resolveChatRoomDisplay } from "@/utils/chatRoomDisplay";

interface ChatRoomListItemProps {
    room: ChatRoomListItemType;
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

const getSourceTypeTranslationKey = (sourceType: ChatRoomSourceType) => {
    switch (sourceType) {
        case "FRIEND":
            return "sourceType.friend";
        case "MANUAL":
            return "sourceType.manual";
        case "OPEN":
            return "sourceType.open";
        case "AI":
            return "sourceType.ai";
        default:
            return "sourceType.unknown";
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
    const isFriendRoom = room.sourceType === "FRIEND";
    const display = resolveChatRoomDisplay(room, {
        friendDirectTitle: t("friend.directTitle"),
        untitledTitle: t("untitledRoom"),
    });

    return (
        <Link
            href={`/chat/rooms/${room.id}`}
            className="group block rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900/70"
        >
            <div className="flex items-start gap-4">
                {display.isFriendDirectRoom ? (
                    <ChatRoomAvatar
                        profileImageUrl={display.profileImageUrl}
                        alt={display.title}
                        size="lg"
                    />
                ) : (
                    <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                            isFriendRoom
                                ? "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300"
                                : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                        }`}
                    >
                        {room.roomType === "GROUP" ? (
                            <Users className="h-5 w-5" aria-hidden="true" />
                        ) : (
                            <MessageCircle
                                className="h-5 w-5"
                                aria-hidden="true"
                            />
                        )}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                                {display.title}
                            </h2>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                {display.isFriendDirectRoom ? (
                                    <span className="font-medium text-orange-600 dark:text-orange-300">
                                        {t("friend.directSubtitle")}
                                    </span>
                                ) : (
                                    <>
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                            {t(
                                                getRoomTypeTranslationKey(
                                                    room.roomType,
                                                ),
                                            )}
                                        </span>
                                        <span
                                            className={`rounded-full px-2 py-0.5 font-medium ${
                                                isFriendRoom
                                                    ? "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300"
                                                    : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                                            }`}
                                        >
                                            {t(
                                                getSourceTypeTranslationKey(
                                                    room.sourceType,
                                                ),
                                            )}
                                        </span>
                                    </>
                                )}

                                <span className="inline-flex items-center gap-1">
                                    <Users
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                    />
                                    {t("members.count", {
                                        count: room.memberCount,
                                    })}
                                </span>
                                <span>Room #{room.id}</span>
                                <span>{formatUpdatedAt(room.updatedAt)}</span>
                            </div>
                        </div>

                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-600" />
                    </div>

                    {room.description && (
                        <p className="mt-3 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
                            {room.description}
                        </p>
                    )}

                    <p className="mt-3 line-clamp-1 text-sm text-slate-400 dark:text-slate-500">
                        {t("latestMessage.placeholder")}
                    </p>
                </div>
            </div>
        </Link>
    );
}
