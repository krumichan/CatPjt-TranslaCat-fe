import { Languages, Users } from "lucide-react";

import type { ChatRoom } from "@/types/chat";
import type { ChatWebSocketConnectionStatus } from "@/types/chatWebSocket";

interface ChatRoomHeaderProps {
    room: ChatRoom;
    connectionStatus?: ChatWebSocketConnectionStatus;
    onLanguageSettingsClick?: () => void;
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

export function ChatRoomHeader({
    room,
    connectionStatus,
    onLanguageSettingsClick,
}: ChatRoomHeaderProps) {
    const connectionStatusLabel = getConnectionStatusLabel(connectionStatus);

    return (
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                    {room.name}
                </h1>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        Room #{room.id} · {room.roomType}
                    </span>

                    {connectionStatusLabel && <span>{connectionStatusLabel}</span>}

                    <span className="inline-flex items-center gap-1">
                        <Languages className="h-3.5 w-3.5" />
                        {room.originalLanguageCode.toUpperCase()} →{" "}
                        {room.translationLanguageCode.toUpperCase()}
                    </span>
                </div>
            </div>

            <button
                type="button"
                onClick={onLanguageSettingsClick}
                className="ml-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
                <Languages className="mr-1 inline h-4 w-4" />
                Lang
            </button>
        </header>
    );
}