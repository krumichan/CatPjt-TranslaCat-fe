"use client";

import { useCallback, useRef, useState } from "react";

import { useRouter } from "@/navigation";
import { getApiErrorCode } from "@/services/common/responseParser";
import { openChatService } from "@/services/chat/openChatService";
import type {
    ChatRoom,
    OpenChatMemberProfile,
} from "@/types/chat";
import { invalidateOpenChatRoomListCache } from "@/utils/chat/openChatCache";

export type OpenChatLifecycleAction =
    | "LEAVE"
    | "TRANSFER_AND_LEAVE"
    | "CLOSE";

export type OpenChatLifecycleDialogMode =
    | OpenChatLifecycleAction
    | "CLOSED_NOTICE"
    | null;

export type OpenChatLifecycleErrorCode =
    | "TARGET_REQUIRED"
    | "ROOM_CLOSED"
    | "ACCESS_DENIED"
    | "LEAVE_FAILED_AFTER_TRANSFER"
    | "ACTION_FAILED";

interface UseOpenChatRoomLifecycleParams {
    roomId: number;
    room: ChatRoom | null;
    openMembers: OpenChatMemberProfile[];
    isMembersLoading: boolean;
    onCloseRoomMenu: () => void;
}

interface UseOpenChatRoomLifecycleResult {
    action: OpenChatLifecycleAction | null;
    dialogMode: OpenChatLifecycleDialogMode;
    candidates: OpenChatMemberProfile[];
    selectedTargetId: number | null;
    isSubmitting: boolean;
    errorCode: OpenChatLifecycleErrorCode | null;
    isRoomClosed: boolean;
    openActionDialog: () => void;
    closeDialog: () => void;
    selectTarget: (openChatMemberId: number) => void;
    submit: () => Promise<boolean>;
    handleRemoteClosed: () => void;
    acknowledgeClosed: () => void;
}

function mapLifecycleError(error: unknown): OpenChatLifecycleErrorCode {
    const errorCode = getApiErrorCode(error);

    if (errorCode === "OPEN_CHAT_ROOM_CLOSED") {
        return "ROOM_CLOSED";
    }
    if (
        errorCode === "OPEN_CHAT_OWNER_ONLY" ||
        errorCode === "OPEN_CHAT_MEMBER_ACCESS_DENIED"
    ) {
        return "ACCESS_DENIED";
    }
    return "ACTION_FAILED";
}

export function useOpenChatRoomLifecycle({
    roomId,
    room,
    openMembers,
    isMembersLoading,
    onCloseRoomMenu,
}: UseOpenChatRoomLifecycleParams): UseOpenChatRoomLifecycleResult {
    const router = useRouter();
    const submitLockRef = useRef(false);
    const [dialogMode, setDialogMode] =
        useState<OpenChatLifecycleDialogMode>(null);
    const [selectedTargetId, setSelectedTargetId] =
        useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorCode, setErrorCode] =
        useState<OpenChatLifecycleErrorCode | null>(null);
    const [isRoomClosed, setIsRoomClosed] = useState(false);
    const [hasTransferredOwner, setHasTransferredOwner] = useState(false);

    const candidates = openMembers.filter(
        (member) => member.active && member.role !== "OWNER",
    );

    let action: OpenChatLifecycleAction | null = null;
    if (room?.roomType === "OPEN" && !isRoomClosed) {
        if (room.myRole === "MEMBER" || room.myRole === "ADMIN") {
            action = "LEAVE";
        } else if (room.myRole === "OWNER" && !isMembersLoading) {
            action = candidates.length > 0 ? "TRANSFER_AND_LEAVE" : "CLOSE";
        }
    }

    const openActionDialog = useCallback(() => {
        if (!action) {
            return;
        }
        onCloseRoomMenu();
        setErrorCode(null);
        setSelectedTargetId(null);
        setHasTransferredOwner(false);
        setDialogMode(action);
    }, [action, onCloseRoomMenu]);

    const closeDialog = useCallback(() => {
        if (!isSubmitting && dialogMode !== "CLOSED_NOTICE") {
            setDialogMode(null);
            setErrorCode(null);
        }
    }, [dialogMode, isSubmitting]);

    const selectTarget = useCallback((openChatMemberId: number) => {
        setSelectedTargetId(openChatMemberId);
        setErrorCode(null);
    }, []);

    const submit = useCallback(async () => {
        if (!dialogMode || dialogMode === "CLOSED_NOTICE" || submitLockRef.current) {
            return false;
        }
        if (dialogMode === "TRANSFER_AND_LEAVE" && selectedTargetId == null) {
            setErrorCode("TARGET_REQUIRED");
            return false;
        }

        submitLockRef.current = true;
        setIsSubmitting(true);
        setErrorCode(null);

        let ownerTransferCompleted = hasTransferredOwner;

        try {
            if (dialogMode === "TRANSFER_AND_LEAVE") {
                if (!ownerTransferCompleted) {
                    await openChatService.transferOwner(roomId, {
                        targetOpenChatMemberId: selectedTargetId as number,
                    });
                    ownerTransferCompleted = true;
                    setHasTransferredOwner(true);
                }
                await openChatService.leaveRoom(roomId);
            } else if (dialogMode === "CLOSE") {
                await openChatService.closeRoom(roomId);
                setIsRoomClosed(true);
            } else {
                await openChatService.leaveRoom(roomId);
            }

            await invalidateOpenChatRoomListCache();
            router.push("/chat/open");
            return true;
        } catch (error) {
            console.error("Failed to process OPEN room lifecycle action.", error);
            setErrorCode(
                dialogMode === "TRANSFER_AND_LEAVE" && ownerTransferCompleted
                    ? "LEAVE_FAILED_AFTER_TRANSFER"
                    : mapLifecycleError(error),
            );
            return false;
        } finally {
            submitLockRef.current = false;
            setIsSubmitting(false);
        }
    }, [
        dialogMode,
        hasTransferredOwner,
        roomId,
        router,
        selectedTargetId,
    ]);

    const handleRemoteClosed = useCallback(() => {
        onCloseRoomMenu();
        setIsRoomClosed(true);
        setErrorCode(null);
        setDialogMode("CLOSED_NOTICE");
    }, [onCloseRoomMenu]);

    const acknowledgeClosed = useCallback(() => {
        setDialogMode(null);
        router.push("/chat/open");
    }, [router]);

    return {
        action,
        dialogMode,
        candidates,
        selectedTargetId,
        isSubmitting,
        errorCode,
        isRoomClosed,
        openActionDialog,
        closeDialog,
        selectTarget,
        submit,
        handleRemoteClosed,
        acknowledgeClosed,
    };
}
