"use client";

import { useEffect } from "react";

import { ChatRoomPageOverlays } from "@/components/chat/room/ChatRoomPageOverlays";
import {
    ChatRoomErrorState,
    ChatRoomLoadingState,
} from "@/components/chat/room/ChatRoomPageState";
import { ChatRoomView } from "@/components/chat/room/ChatRoomView";
import { useChatRoomPageController } from "@/hooks/chat/useChatRoomPageController";

interface ChatRoomSmartPageProps {
    roomId: number;
    initialFirstUnreadMessageId?: number | null;
}

export function ChatRoomSmartPage({
    roomId,
    initialFirstUnreadMessageId = null,
}: ChatRoomSmartPageProps) {
    const controller = useChatRoomPageController(
        roomId,
        initialFirstUnreadMessageId,
    );

    useEffect(() => {
        if (
            controller.chatRoom.activeAnchorMessageId === null ||
            typeof window === "undefined"
        ) {
            return;
        }

        const nextSearchParams = new URLSearchParams(window.location.search);
        if (!nextSearchParams.has("firstUnreadMessageId")) {
            return;
        }

        nextSearchParams.delete("firstUnreadMessageId");
        const query = nextSearchParams.toString();
        window.history.replaceState(
            window.history.state,
            "",
            `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
        );
    }, [controller.chatRoom.activeAnchorMessageId]);

    if (controller.chatRoom.isLoading) {
        return (
            <ChatRoomLoadingState
                message={controller.loadingMessage}
            />
        );
    }

    if (controller.chatRoom.loadErrorCode || !controller.chatRoom.room) {
        return (
            <ChatRoomErrorState
                title={controller.errorTitle}
                message={controller.loadErrorMessage}
                retryLabel={controller.retryLabel}
                onRetry={() => void controller.chatRoom.reload()}
            />
        );
    }

    return (
        <>
            <ChatRoomView
                room={controller.chatRoom.room}
                controller={controller}
            />
            <ChatRoomPageOverlays
                room={controller.chatRoom.room}
                controller={controller}
            />
        </>
    );
}
