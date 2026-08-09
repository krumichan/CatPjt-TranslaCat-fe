"use client";

import { useCallback, useRef } from "react";

import { ChatAiManagementModal } from "@/components/chat/ai/ChatAiManagementModal";
import { useChatAiManagement } from "@/hooks/chat/useChatAiManagement";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import type { ChatRoomType } from "@/types/chat";

interface ChatAiManagementSmartModalProps {
    isOpen: boolean;
    roomId: number;
    roomType: ChatRoomType;
    canManage: boolean;
    onClose: () => void;
}

export function ChatAiManagementSmartModal({
    isOpen,
    roomId,
    roomType,
    canManage,
    onClose,
}: ChatAiManagementSmartModalProps) {
    const modalRef = useRef<HTMLElement>(null);
    const controller = useChatAiManagement({
        isOpen,
        roomId,
        canManage,
    });

    const closeSafely = useCallback(() => {
        if (controller.deleteTarget || controller.isBusy) {
            return;
        }
        onClose();
    }, [controller.deleteTarget, controller.isBusy, onClose]);

    useModalFocusTrap(isOpen, modalRef, closeSafely);

    return (
        <ChatAiManagementModal
            isOpen={isOpen}
            roomType={roomType}
            canManage={canManage}
            modalRef={modalRef}
            controller={controller}
            onClose={closeSafely}
        />
    );
}
