import { ChatRoomPage } from "@/components/chat/room/ChatRoomPage";
import {notFound} from "next/navigation";

interface PageProps {
    params: Promise<{
        locale: string;
        roomId: string;
    }>;
}

export default async function ChatRoomRoutePage({ params }: PageProps) {
    const { roomId: roomIdParam } = await params;

    const roomId = Number(roomIdParam);

    if (!Number.isSafeInteger(roomId) || roomId <= 0) {
        notFound();
    }

    return <ChatRoomPage roomId={roomId} />;
}