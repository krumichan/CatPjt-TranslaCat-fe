"use client";

import { useCallback, useRef, useState } from "react";

import { useRouter } from "@/navigation";
import { getApiErrorCode } from "@/services/common/responseParser";
import { openChatService } from "@/services/chat/openChatService";
import type {
    OpenChatProfileFormMode,
    OpenChatProfileFormValue,
    OpenChatRoomDetail,
} from "@/types/chat";
import { invalidateOpenChatRoomListCache } from "@/utils/chat/openChatCache";

export type OpenChatJoinErrorCode =
    | "JOIN_ROOM_FULL"
    | "JOIN_ROOM_CLOSED"
    | "JOIN_BANNED"
    | "NICKNAME_REQUIRED"
    | "NICKNAME_TOO_LONG"
    | "JOIN_FAILED"
    | "PROFILE_IMAGE_FAILED_AFTER_JOIN";

export type OpenChatJoinProcessStage =
    | "SAVING"
    | "UPLOADING"
    | "DELETING";

interface UseOpenChatJoinParams {
    roomId: number;
    room: OpenChatRoomDetail | null;
    onRoomChanged: (room: OpenChatRoomDetail) => void;
    onReloadRoom: () => Promise<OpenChatRoomDetail | null>;
}

interface UseOpenChatJoinResult {
    isOpen: boolean;
    mode: OpenChatProfileFormMode;
    isSubmitting: boolean;
    processStage: OpenChatJoinProcessStage | null;
    errorCode: OpenChatJoinErrorCode | null;
    joinedPendingImage: boolean;
    open: () => void;
    close: () => void;
    submit: (value: OpenChatProfileFormValue) => Promise<boolean>;
}

function mapJoinError(error: unknown): OpenChatJoinErrorCode {
    switch (getApiErrorCode(error)) {
        case "OPEN_CHAT_ROOM_FULL":
            return "JOIN_ROOM_FULL";
        case "OPEN_CHAT_ROOM_CLOSED":
            return "JOIN_ROOM_CLOSED";
        case "OPEN_CHAT_MEMBER_ACCESS_DENIED":
        case "OPEN_CHAT_MEMBER_BANNED":
            return "JOIN_BANNED";
        case "OPEN_CHAT_NICKNAME_REQUIRED":
        case "OPEN_CHAT_JOIN_PROFILE_REQUIRED":
            return "NICKNAME_REQUIRED";
        case "OPEN_CHAT_NICKNAME_TOO_LONG":
            return "NICKNAME_TOO_LONG";
        default:
            return "JOIN_FAILED";
    }
}

export function useOpenChatJoin({
    roomId,
    room,
    onRoomChanged,
    onReloadRoom,
}: UseOpenChatJoinParams): UseOpenChatJoinResult {
    const router = useRouter();
    const submitLockRef = useRef(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [processStage, setProcessStage] =
        useState<OpenChatJoinProcessStage | null>(null);
    const [errorCode, setErrorCode] =
        useState<OpenChatJoinErrorCode | null>(null);
    const [joinedRoom, setJoinedRoom] =
        useState<OpenChatRoomDetail | null>(null);

    const mode: OpenChatProfileFormMode = room?.myOpenProfile
        ? "rejoin"
        : "join";

    const open = useCallback(() => {
        setErrorCode(null);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        if (!isSubmitting) {
            setIsOpen(false);
            setErrorCode(null);
        }
    }, [isSubmitting]);

    const submit = useCallback(
        async (value: OpenChatProfileFormValue) => {
            if (submitLockRef.current || !room) {
                return false;
            }

            submitLockRef.current = true;
            setIsSubmitting(true);
            setErrorCode(null);

            let targetRoom = joinedRoom;

            try {
                if (!targetRoom) {
                    setProcessStage("SAVING");
                    targetRoom = await openChatService.joinRoom(roomId, {
                        profile: {
                            nickname: value.nickname,
                            profileImageObjectKey: null,
                        },
                    });
                    setJoinedRoom(targetRoom);
                    onRoomChanged(targetRoom);
                }

                if (value.imageFile) {
                    setProcessStage("UPLOADING");
                    await openChatService.uploadMyProfileImage(
                        roomId,
                        value.imageFile,
                    );
                } else if (value.removeImage) {
                    setProcessStage("DELETING");
                    await openChatService.deleteMyProfileImage(roomId);
                }

                await invalidateOpenChatRoomListCache();
                router.push(`/chat/rooms/${roomId}`);
                return true;
            } catch (error) {
                console.error("Failed to join OPEN chat room.", error);

                if (targetRoom) {
                    setErrorCode("PROFILE_IMAGE_FAILED_AFTER_JOIN");
                } else {
                    const nextError = mapJoinError(error);
                    setErrorCode(nextError);

                    if (
                        nextError === "JOIN_ROOM_FULL" ||
                        nextError === "JOIN_ROOM_CLOSED" ||
                        nextError === "JOIN_BANNED"
                    ) {
                        await onReloadRoom();
                    }
                }
                return false;
            } finally {
                submitLockRef.current = false;
                setIsSubmitting(false);
                setProcessStage(null);
            }
        },
        [
            joinedRoom,
            onReloadRoom,
            onRoomChanged,
            room,
            roomId,
            router,
        ],
    );

    return {
        isOpen,
        mode,
        isSubmitting,
        processStage,
        errorCode,
        joinedPendingImage: joinedRoom !== null,
        open,
        close,
        submit,
    };
}
