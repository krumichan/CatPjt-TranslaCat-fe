"use client";

import { ChatRoomSmartPage } from "@/components/chat/room/ChatRoomSmartPage";

interface ChatRoomPageProps {
    roomId: number;
}

export function ChatRoomPage({ roomId }: ChatRoomPageProps) {
    return <ChatRoomSmartPage roomId={roomId} />;
}
