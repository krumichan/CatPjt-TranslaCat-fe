"use client";

import { OpenChatExploreView } from "@/components/chat/open-explore/OpenChatExploreView";
import { useOpenChatRooms } from "@/hooks/chat/useOpenChatRooms";

interface OpenChatExplorePageProps {
    initialKeyword?: string;
}

export function OpenChatExplorePage({
    initialKeyword = "",
}: OpenChatExplorePageProps) {
    const controller = useOpenChatRooms(initialKeyword);

    return <OpenChatExploreView controller={controller} />;
}
