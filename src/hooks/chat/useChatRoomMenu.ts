"use client";

import { useCallback, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { chatRoomMemberService } from "@/services/chat/chatRoomMemberService";
import type { ChatRoomMember } from "@/types/chat";

export type ChatRoomMenuLoadErrorCode =
    | "LOAD_FAILED";

interface UseChatRoomMenuParams {
    roomId: number;
}

interface UseChatRoomMenuResult {
    isOpen: boolean;
    members: ChatRoomMember[];
    isLoading: boolean;
    loadErrorCode: ChatRoomMenuLoadErrorCode | null;
    openMenu: () => void;
    closeMenu: () => void;
    reloadMembers: () => Promise<void>;
}

export function useChatRoomMenu({
    roomId,
}: UseChatRoomMenuParams): UseChatRoomMenuResult {
    const [isOpen, setIsOpen] = useState(false);

    const {
        data,
        isLoading,
        isError,
        mutate,
    } = useQuery({
        keys: isOpen
            ? (["chat-room-members", roomId] as const)
            : null,
        fetcher: (
            _resource: string,
            targetRoomId: number,
        ) =>
            chatRoomMemberService.getMembers(
                targetRoomId,
            ),
    });

    const openMenu = useCallback(() => {
        setIsOpen(true);
    }, []);

    const closeMenu = useCallback(() => {
        setIsOpen(false);
    }, []);

    const reloadMembers = useCallback(async () => {
        await mutate(
            (currentData) => currentData,
            true,
        );
    }, [mutate]);

    return {
        isOpen,
        members: data?.members ?? [],
        isLoading,
        loadErrorCode: isError
            ? "LOAD_FAILED"
            : null,
        openMenu,
        closeMenu,
        reloadMembers,
    };
}
