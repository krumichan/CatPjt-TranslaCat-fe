import { Languages, Loader2, Users } from "lucide-react";

import type { ChatLanguageSettings, ChatRoom } from "@/types/chat";
import type { ChatWebSocketConnectionStatus } from "@/types/chatWebSocket";

interface ChatRoomHeaderProps {
    room: ChatRoom;
    connectionStatus?: ChatWebSocketConnectionStatus;
    languageSettings?: ChatLanguageSettings | null;
    isLanguageSettingsLoading?: boolean;
    languageSettingsLoadErrorCode?: string | null;
    onOpenLanguageSettings?: () => void;
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

function resolveLanguageLabel(
    room: ChatRoom,
    languageSettings?: ChatLanguageSettings | null,
) {
    const originalLanguageCode =
        languageSettings?.originalLanguageCode ?? room.originalLanguageCode;
    const translationLanguageCode =
        languageSettings?.translationLanguageCode ??
        room.translationLanguageCode;

    if (!originalLanguageCode || !translationLanguageCode) {
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
}: ChatRoomHeaderProps) {
    const connectionStatusLabel = getConnectionStatusLabel(connectionStatus);
    const roomTitle = room.name || `Room #${room.id}`;
    const languageLabel = resolveLanguageLabel(room, languageSettings);

    return (
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                    {roomTitle}
                </h1>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        Room #{room.id} · {room.roomType}
                    </span>

                    {connectionStatusLabel && <span>{connectionStatusLabel}</span>}

                    <span className="inline-flex items-center gap-1">
                        <Languages className="h-3.5 w-3.5" />
                        {isLanguageSettingsLoading ? (
                            <>
                                <Loader2
                                    className="h-3.5 w-3.5 animate-spin"
                                    aria-hidden="true"
                                />
                                Loading
                            </>
                        ) : languageSettingsLoadErrorCode ? (
                            "Language setting error"
                        ) : (
                            languageLabel ?? "-"
                        )}
                    </span>
                </div>
            </div>

            <button
                type="button"
                onClick={onOpenLanguageSettings}
                disabled={!onOpenLanguageSettings}
                className="ml-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
                <Languages className="mr-1 inline h-4 w-4" />
                Lang
            </button>
        </header>
    );
}
