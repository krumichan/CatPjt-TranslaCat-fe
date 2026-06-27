"use client";

import { ChatRoomListItem } from "@/components/chat/list/ChatRoomListItem";
import type { ChatRoom } from "@/types/chat";

interface ChatRoomListProps {
    rooms: ChatRoom[];
}

export function ChatRoomList({ rooms }: ChatRoomListProps) {
    return (
        <section className="grid gap-3">
            {rooms.map((room) => (
                <ChatRoomListItem key={room.id} room={room} />
            ))}
        </section>
    );
}