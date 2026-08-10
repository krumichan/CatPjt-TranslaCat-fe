"use client";

import {
    useCallback,
    useRef,
    useState,
} from "react";

import { getApiErrorCode } from "@/services/common/responseParser";
import { chatRoomMemberService } from "@/services/chat/chatRoomMemberService";
import { friendRequestService } from "@/services/friend/friendRequestService";
import type { ChatRoomMemberProfile } from "@/types/chat";
import type { FriendRelationStatus } from "@/types/friendship";

export type ChatMemberProfileLoadErrorCode =
    | "LOAD_FAILED";

export type ChatMemberFriendRequestErrorCode =
    | "SEND_REQUEST_FAILED"
    | "TARGET_NOT_FOUND";

interface UseChatMemberProfilePreviewParams {
    roomId: number;
}

interface UseChatMemberProfilePreviewResult {
    selectedUserId: number | null;
    profile: ChatRoomMemberProfile | null;
    isOpen: boolean;
    isLoading: boolean;
    isSendingFriendRequest: boolean;
    loadErrorCode: ChatMemberProfileLoadErrorCode | null;
    friendRequestErrorCode:
        | ChatMemberFriendRequestErrorCode
        | null;
    openProfile: (userId: number) => Promise<boolean>;
    retryProfile: () => Promise<boolean>;
    closeProfile: () => void;
    sendFriendRequest: () => Promise<boolean>;
    applyPresence: (userId: number, online: boolean) => void;
}

function toFriendStatusByApiError(
    error: unknown,
): FriendRelationStatus | null {
    const errorCode = getApiErrorCode(error);

    if (errorCode === "FRIEND_REQUEST_ALREADY_PENDING") {
        return "REQUEST_SENT";
    }

    if (errorCode === "FRIEND_ALREADY_EXISTS") {
        return "FRIEND";
    }

    if (errorCode === "USER_BLOCKED_BETWEEN") {
        return "BLOCKED";
    }

    if (errorCode === "FRIEND_REQUEST_SELF_NOT_ALLOWED") {
        return "SELF";
    }

    return null;
}

function toFriendRequestErrorCode(
    error: unknown,
): ChatMemberFriendRequestErrorCode {
    const errorCode = getApiErrorCode(error);

    if (
        errorCode === "PUBLIC_ID_NOT_FOUND" ||
        errorCode === "USER_NOT_FOUND"
    ) {
        return "TARGET_NOT_FOUND";
    }

    return "SEND_REQUEST_FAILED";
}

export function useChatMemberProfilePreview({
    roomId,
}: UseChatMemberProfilePreviewParams): UseChatMemberProfilePreviewResult {
    const [selectedUserId, setSelectedUserId] =
        useState<number | null>(null);
    const [profile, setProfile] =
        useState<ChatRoomMemberProfile | null>(null);
    const [isLoading, setIsLoading] =
        useState(false);
    const [
        isSendingFriendRequest,
        setIsSendingFriendRequest,
    ] = useState(false);
    const [loadErrorCode, setLoadErrorCode] =
        useState<ChatMemberProfileLoadErrorCode | null>(
            null,
        );
    const [
        friendRequestErrorCode,
        setFriendRequestErrorCode,
    ] =
        useState<ChatMemberFriendRequestErrorCode | null>(
            null,
        );

    const profileRequestSequence = useRef(0);
    const friendRequestSequence = useRef(0);
    const presencePatchVersionByUserIdRef = useRef(new Map<number, number>());
    const latestPresenceByUserIdRef = useRef(new Map<number, boolean>());

    const openProfile = useCallback(
        async (userId: number) => {
            const requestSequence =
                ++profileRequestSequence.current;
            const presencePatchVersionAtRequest =
                presencePatchVersionByUserIdRef.current.get(userId) ?? 0;

            setSelectedUserId(userId);
            setProfile(null);
            setLoadErrorCode(null);
            setFriendRequestErrorCode(null);
            setIsLoading(true);

            try {
                const nextProfile =
                    await chatRoomMemberService.getMemberProfile(
                        roomId,
                        userId,
                    );

                if (
                    requestSequence !==
                    profileRequestSequence.current
                ) {
                    return false;
                }

                const latestPresencePatchVersion =
                    presencePatchVersionByUserIdRef.current.get(userId) ?? 0;
                const latestOnline =
                    latestPresenceByUserIdRef.current.get(userId);

                setProfile(
                    latestPresencePatchVersion >
                            presencePatchVersionAtRequest &&
                        latestOnline !== undefined
                        ? { ...nextProfile, online: latestOnline }
                        : nextProfile,
                );
                return true;
            } catch (error) {
                console.error(
                    "Failed to load chat room member profile.",
                    error,
                );

                if (
                    requestSequence ===
                    profileRequestSequence.current
                ) {
                    setLoadErrorCode("LOAD_FAILED");
                }

                return false;
            } finally {
                if (
                    requestSequence ===
                    profileRequestSequence.current
                ) {
                    setIsLoading(false);
                }
            }
        },
        [roomId],
    );

    const retryProfile = useCallback(async () => {
        if (selectedUserId === null) {
            return false;
        }

        return openProfile(selectedUserId);
    }, [openProfile, selectedUserId]);

    const applyPresence = useCallback((userId: number, online: boolean) => {
        const previousVersion =
            presencePatchVersionByUserIdRef.current.get(userId) ?? 0;
        presencePatchVersionByUserIdRef.current.set(
            userId,
            previousVersion + 1,
        );
        latestPresenceByUserIdRef.current.set(userId, online);

        setProfile((current) =>
            current?.userId === userId ? { ...current, online } : current,
        );
    }, []);

    const closeProfile = useCallback(() => {
        profileRequestSequence.current += 1;
        friendRequestSequence.current += 1;

        setSelectedUserId(null);
        setProfile(null);
        setIsLoading(false);
        setIsSendingFriendRequest(false);
        setLoadErrorCode(null);
        setFriendRequestErrorCode(null);
    }, []);

    const sendFriendRequest = useCallback(async () => {
        if (
            !profile ||
            profile.friendStatus !== "NONE" ||
            isSendingFriendRequest
        ) {
            return false;
        }

        const targetUserId = profile.userId;
        const requestSequence =
            ++friendRequestSequence.current;

        setIsSendingFriendRequest(true);
        setFriendRequestErrorCode(null);

        try {
            await friendRequestService.sendFriendRequest({
                receiverPublicId: profile.publicId,
            });

            if (
                requestSequence !==
                friendRequestSequence.current
            ) {
                return false;
            }

            setProfile((current) =>
                current?.userId === targetUserId
                    ? {
                          ...current,
                          friendStatus: "REQUEST_SENT",
                      }
                    : current,
            );

            return true;
        } catch (error) {
            console.error(
                "Failed to send friend request from chat member profile.",
                error,
            );

            if (
                requestSequence !==
                friendRequestSequence.current
            ) {
                return false;
            }

            const nextStatus =
                toFriendStatusByApiError(error);

            if (nextStatus) {
                setProfile((current) =>
                    current?.userId === targetUserId
                        ? {
                              ...current,
                              friendStatus: nextStatus,
                          }
                        : current,
                );
                setFriendRequestErrorCode(null);
                return false;
            }

            setFriendRequestErrorCode(
                toFriendRequestErrorCode(error),
            );
            return false;
        } finally {
            if (
                requestSequence ===
                friendRequestSequence.current
            ) {
                setIsSendingFriendRequest(false);
            }
        }
    }, [isSendingFriendRequest, profile]);

    return {
        selectedUserId,
        profile,
        isOpen: selectedUserId !== null,
        isLoading,
        isSendingFriendRequest,
        loadErrorCode,
        friendRequestErrorCode,
        openProfile,
        retryProfile,
        closeProfile,
        sendFriendRequest,
        applyPresence,
    };
}
