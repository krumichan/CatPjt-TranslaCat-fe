import { Languages, Users } from "lucide-react";

import type { ChatRoom } from "@/types/chat";

interface ChatRoomHeaderProps {
    room: ChatRoom;
}

export function ChatRoomHeader({ room }: ChatRoomHeaderProps) {
    return (
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
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

                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Languages className="h-4 w-4" />
                    <span>
            {room.originalLanguageCode.toUpperCase()} →{" "}
                        {room.translationLanguageCode.toUpperCase()}
          </span>
                </div>
            </div>
        </header>
    );
}