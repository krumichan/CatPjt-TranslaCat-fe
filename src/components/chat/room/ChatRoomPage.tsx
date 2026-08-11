"use client";

import { ChatRoomSmartPage } from "@/components/chat/room/ChatRoomSmartPage";

interface ChatRoomPageProps {
    roomId: number;
    initialFirstUnreadMessageId?: number | null;
}

export function ChatRoomPage({
    roomId,
    initialFirstUnreadMessageId = null,
}: ChatRoomPageProps) {
    return (
        <ChatRoomSmartPage
            roomId={roomId}
            initialFirstUnreadMessageId={initialFirstUnreadMessageId}
        />
    );
}
