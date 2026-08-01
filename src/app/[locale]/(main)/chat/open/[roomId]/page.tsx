import { notFound } from "next/navigation";

import { OpenChatDetailPage } from "@/components/chat/open-detail/OpenChatDetailPage";

interface OpenChatDetailRoutePageProps {
    params: Promise<{
        locale: string;
        roomId: string;
    }>;
    searchParams: Promise<{ notice?: string }>;
}

export default async function OpenChatDetailRoutePage({
    params,
    searchParams,
}: OpenChatDetailRoutePageProps) {
    const [{ roomId: roomIdParam }, query] = await Promise.all([
        params,
        searchParams,
    ]);
    const roomId = Number(roomIdParam);

    if (!Number.isSafeInteger(roomId) || roomId <= 0) {
        notFound();
    }

    return (
        <OpenChatDetailPage
            roomId={roomId}
            showBannedNotice={query.notice === "banned"}
        />
    );
}
