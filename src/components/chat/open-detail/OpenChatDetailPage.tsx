"use client";

import { OpenChatDetailView } from "@/components/chat/open-detail/OpenChatDetailView";
import { OpenChatJoinDialog } from "@/components/chat/open-detail/OpenChatJoinDialog";
import { useOpenChatJoin } from "@/hooks/chat/useOpenChatJoin";
import { useOpenChatRoomDetail } from "@/hooks/chat/useOpenChatRoomDetail";

interface OpenChatDetailPageProps {
    roomId: number;
    showBannedNotice?: boolean;
}

export function OpenChatDetailPage({
    roomId,
    showBannedNotice = false,
}: OpenChatDetailPageProps) {
    const detail = useOpenChatRoomDetail(roomId);
    const join = useOpenChatJoin({
        roomId,
        room: detail.room,
        onRoomChanged: detail.applyRoom,
        onReloadRoom: detail.reload,
    });

    return (
        <>
            <OpenChatDetailView
                room={detail.room}
                showBannedNotice={showBannedNotice}
                isLoading={detail.isLoading}
                loadErrorCode={detail.loadErrorCode}
                onRetry={detail.reload}
                onOpenJoin={join.open}
            />

            {detail.room && (
                <OpenChatJoinDialog
                    isOpen={join.isOpen}
                    room={detail.room}
                    mode={join.mode}
                    isSubmitting={join.isSubmitting}
                    processStage={join.processStage}
                    errorCode={join.errorCode}
                    joinedPendingImage={join.joinedPendingImage}
                    onClose={join.close}
                    onSubmit={join.submit}
                />
            )}
        </>
    );
}
