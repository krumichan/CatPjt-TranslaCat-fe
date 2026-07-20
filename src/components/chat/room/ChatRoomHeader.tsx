"use client";

import {
    ChevronLeft,
    Languages,
    Loader2,
    Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { ChatRoomAvatar } from "@/components/chat/common/ChatRoomAvatar";
import { Link } from "@/navigation";
import type {
    ChatLanguageSettings,
    ChatRoom,
    ChatRoomSourceType,
    ChatRoomType,
} from "@/types/chat";
import type { ChatWebSocketConnectionStatus } from "@/types/chatWebSocket";
import { resolveChatRoomDisplay } from "@/utils/chatRoomDisplay";

interface ChatRoomHeaderProps {
    room: ChatRoom;
    connectionStatus?: ChatWebSocketConnectionStatus;
    languageSettings?: ChatLanguageSettings | null;
    isLanguageSettingsLoading?: boolean;
    languageSettingsLoadErrorCode?: string | null;
    onOpenLanguageSettings?: () => void;
    onOpenPartnerProfile?: () => void;
}

function getConnectionStatusLabel(
    connectionStatus?: ChatWebSocketConnectionStatus,
) {
    switch (connectionStatus) {
        case "CONNECTED":
            return "WS: CONNECTED";
        case "CONNECTING":
            return "WS: CONNECTING";
        case "DISCONNECTED":
            return "WS: DISCONNECTED";
        case "ERROR":
            return "WS: ERROR";
        case "IDLE":
            return "WS: IDLE";
        default:
            return null;
    }
}

function getRoomTypeTranslationKey(
    roomType: ChatRoomType,
) {
    switch (roomType) {
        case "DIRECT":
            return "header.roomType.direct";
        case "GROUP":
            return "header.roomType.group";
        case "OPEN":
            return "header.roomType.open";
        default:
            return "header.roomType.unknown";
    }
}

function getSourceTypeTranslationKey(
    sourceType: ChatRoomSourceType,
) {
    switch (sourceType) {
        case "FRIEND":
            return "header.sourceType.friend";
        case "MANUAL":
            return "header.sourceType.manual";
        case "OPEN":
            return "header.sourceType.open";
        case "AI":
            return "header.sourceType.ai";
        default:
            return "header.sourceType.unknown";
    }
}

function resolveLanguageLabel(
    room: ChatRoom,
    languageSettings?: ChatLanguageSettings | null,
) {
    const originalLanguageCode =
        languageSettings?.originalLanguageCode ??
        room.originalLanguageCode;

    const translationLanguageCode =
        languageSettings?.translationLanguageCode ??
        room.translationLanguageCode;

    if (
        !originalLanguageCode ||
        !translationLanguageCode
    ) {
        return null;
    }

    return `${originalLanguageCode.toUpperCase()} → ${translationLanguageCode.toUpperCase()}`;
}

export function ChatRoomHeader({
    room,
    connectionStatus,
    languageSettings,
    isLanguageSettingsLoading = false,
    languageSettingsLoadErrorCode = null,
    onOpenLanguageSettings,
    onOpenPartnerProfile,
}: ChatRoomHeaderProps) {
    const t = useTranslations("ChatRoom");
    const connectionStatusLabel =
        getConnectionStatusLabel(connectionStatus);

    const display = resolveChatRoomDisplay(room, {
        friendDirectTitle: t(
            "header.friendDirectTitle",
        ),
        untitledTitle: t("header.untitledRoom", {
            id: room.id,
        }),
    });

    const languageLabel = resolveLanguageLabel(
        room,
        languageSettings,
    );

    const partnerProfileButtonLabel =
        room.directPartner
            ? t("header.openPartnerProfile", {
                  nickname:
                      room.directPartner.displayName,
              })
            : null;

    return (
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:gap-3 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <Link
                    href="/chat"
                    aria-label={t("header.backToList")}
                    data-testid="chat-room-back-button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                    <ChevronLeft
                        className="h-5 w-5"
                        aria-hidden="true"
                    />
                </Link>

                {display.isFriendDirectRoom &&
                    (room.directPartner ? (
                        <button
                            type="button"
                            onClick={() =>
                                onOpenPartnerProfile?.()
                            }
                            disabled={
                                !onOpenPartnerProfile
                            }
                            aria-label={
                                partnerProfileButtonLabel ??
                                undefined
                            }
                            data-testid="chat-partner-profile-button"
                            className="shrink-0 cursor-pointer rounded-xl transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-default disabled:opacity-70 dark:focus-visible:ring-offset-slate-900"
                        >
                            <ChatRoomAvatar
                                profileImageUrl={
                                    display.profileImageUrl
                                }
                                alt={display.title}
                            />
                        </button>
                    ) : (
                        <ChatRoomAvatar
                            profileImageUrl={
                                display.profileImageUrl
                            }
                            alt={display.title}
                        />
                    ))}

                <div className="min-w-0">
                    <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                        {display.title}
                    </h1>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                            <Users
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                            />
                            {t("header.roomId", {
                                id: room.id,
                            })}{" "}
                            ·{" "}
                            {t(
                                getRoomTypeTranslationKey(
                                    room.roomType,
                                ),
                            )}{" "}
                            ·{" "}
                            {t(
                                getSourceTypeTranslationKey(
                                    room.sourceType,
                                ),
                            )}{" "}
                            ·{" "}
                            {t("header.members", {
                                count: room.memberCount,
                            })}
                        </span>

                        {connectionStatusLabel && (
                            <span>
                                {connectionStatusLabel}
                            </span>
                        )}

                        <span className="inline-flex items-center gap-1">
                            <Languages
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                            />

                            {isLanguageSettingsLoading ? (
                                <>
                                    <Loader2
                                        className="h-3.5 w-3.5 animate-spin"
                                        aria-hidden="true"
                                    />
                                    {t(
                                        "header.language.loading",
                                    )}
                                </>
                            ) : languageSettingsLoadErrorCode ? (
                                t(
                                    "header.language.error",
                                )
                            ) : (
                                (languageLabel ?? "-")
                            )}
                        </span>
                    </div>
                </div>
            </div>

            <button
                type="button"
                data-testid="chat-language-settings-button"
                onClick={onOpenLanguageSettings}
                disabled={!onOpenLanguageSettings}
                className="shrink-0 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
                <Languages
                    className="mr-1 inline h-4 w-4"
                    aria-hidden="true"
                />
                <span className="hidden sm:inline">
                    {t("header.language.button")}
                </span>
            </button>
        </header>
    );
}
