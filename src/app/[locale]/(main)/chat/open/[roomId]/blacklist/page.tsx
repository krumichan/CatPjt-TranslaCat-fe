import { notFound, redirect } from "next/navigation";

interface OpenChatBlacklistRoutePageProps {
    params: Promise<{
        locale: string;
        roomId: string;
    }>;
}

export default async function OpenChatBlacklistRoutePage({
    params,
}: OpenChatBlacklistRoutePageProps) {
    const { locale, roomId: roomIdParam } = await params;
    const roomId = Number(roomIdParam);

    if (!Number.isSafeInteger(roomId) || roomId <= 0) {
        notFound();
    }

    redirect(`/${locale}/chat/rooms/${roomId}?openBlacklist=1`);
}
