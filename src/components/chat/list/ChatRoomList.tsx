"use client";

import { ChatRoomListItem } from "@/components/chat/list/ChatRoomListItem";
import type { ChatRoomListItem as ChatRoomListItemType } from "@/types/chat";

interface ChatRoomListProps {
    rooms: ChatRoomListItemType[];
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
