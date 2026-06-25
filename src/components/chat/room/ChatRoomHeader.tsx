import { Languages, Users } from "lucide-react";

import type { ChatRoom } from "@/types/chat";
import type { ChatWebSocketConnectionStatus } from "@/types/chatWebSocket";

interface ChatRoomHeaderProps {
    room: ChatRoom;
    connectionStatus?: ChatWebSocketConnectionStatus;
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
}: ChatRoomHeaderProps) {
    const connectionStatusLabel = getConnectionStatusLabel(connectionStatus);

    return (
        <header className="shrink-0 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-slate-500" />
                        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {room.name}
                        </h1>
                    </div>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Room #{room.id} · {room.roomType}
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    {connectionStatusLabel && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {connectionStatusLabel}
                        </span>
                    )}

                    <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Languages className="h-4 w-4" />
                        <span>
                            {room.originalLanguageCode.toUpperCase()} →{" "}
                            {room.translationLanguageCode.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
}