import { ChatRoomPage } from "@/components/chat/room/ChatRoomPage";

interface PageProps {
    params: Promise<{
        locale: string;
        roomId: string;
    }>;
}

export default async function Page({ params }: PageProps) {
    const { roomId } = await params;

    return <ChatRoomPage roomId={roomId} />;
}