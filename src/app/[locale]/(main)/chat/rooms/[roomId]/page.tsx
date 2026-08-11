import { ChatRoomPage } from "@/components/chat/room/ChatRoomPage";
import {notFound} from "next/navigation";

interface PageProps {
    params: Promise<{
        locale: string;
        roomId: string;
    }>;
    searchParams: Promise<{
        firstUnreadMessageId?: string | string[];
    }>;
}

export default async function ChatRoomRoutePage({
    params,
    searchParams,
}: PageProps) {
    const { roomId: roomIdParam } = await params;
    const { firstUnreadMessageId: firstUnreadMessageIdParam } =
        await searchParams;

    const roomId = Number(roomIdParam);

    if (!Number.isSafeInteger(roomId) || roomId <= 0) {
        notFound();
    }

    const firstUnreadMessageIdValue = Array.isArray(
        firstUnreadMessageIdParam,
    )
        ? firstUnreadMessageIdParam[0]
        : firstUnreadMessageIdParam;
    const parsedFirstUnreadMessageId = Number(firstUnreadMessageIdValue);
    const initialFirstUnreadMessageId =
        Number.isSafeInteger(parsedFirstUnreadMessageId) &&
        parsedFirstUnreadMessageId > 0
            ? parsedFirstUnreadMessageId
            : null;

    return (
        <ChatRoomPage
            roomId={roomId}
            initialFirstUnreadMessageId={initialFirstUnreadMessageId}
        />
    );
}