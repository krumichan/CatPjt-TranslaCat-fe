"use client";

import { ChatRoomPageOverlays } from "@/components/chat/room/ChatRoomPageOverlays";
import {
    ChatRoomErrorState,
    ChatRoomLoadingState,
} from "@/components/chat/room/ChatRoomPageState";
import { ChatRoomView } from "@/components/chat/room/ChatRoomView";
import { useChatRoomPageController } from "@/hooks/chat/useChatRoomPageController";

interface ChatRoomSmartPageProps {
    roomId: number;
}

export function ChatRoomSmartPage({
    roomId,
}: ChatRoomSmartPageProps) {
    const controller = useChatRoomPageController(roomId);

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
