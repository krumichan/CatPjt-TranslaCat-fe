"use client";

import { Loader2 } from "lucide-react";

interface ChatRoomLoadingStateProps {
    message: string;
}

export function ChatRoomLoadingState({
    message,
}: ChatRoomLoadingStateProps) {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-slate-500 dark:text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {message}
        </div>
    );
}
