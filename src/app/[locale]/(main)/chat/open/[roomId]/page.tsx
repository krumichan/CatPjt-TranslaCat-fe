import { notFound } from "next/navigation";

import { OpenChatDetailPage } from "@/components/chat/open-detail/OpenChatDetailPage";

interface OpenChatDetailRoutePageProps {
    params: Promise<{
        locale: string;
        roomId: string;
    }>;
}

export default async function OpenChatDetailRoutePage({
    params,
}: OpenChatDetailRoutePageProps) {
    const { roomId: roomIdParam } = await params;
    const roomId = Number(roomIdParam);

    if (!Number.isSafeInteger(roomId) || roomId <= 0) {
        notFound();
    }

    return <OpenChatDetailPage roomId={roomId} />;
}
