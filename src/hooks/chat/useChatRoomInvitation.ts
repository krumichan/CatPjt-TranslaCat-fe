"use client";

import {
    useCallback,
    useMemo,
    useState,
} from "react";

import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/navigation";
import { chatRoomInvitationService } from "@/services/chat/chatRoomInvitationService";
import { chatRoomMemberService } from "@/services/chat/chatRoomMemberService";
import { getApiErrorCode } from "@/services/common/responseParser";
import { friendService } from "@/services/friend/friendService";
import type {
    ChatRoom,
    ChatRoomMember,
} from "@/types/chat";
import type { Friend } from "@/types/social";

export type ChatRoomInvitationErrorCode =
    | "TARGET_REQUIRED"
    | "NOT_ALLOWED"
    | "UNSUPPORTED_ROOM_TYPE"
    | "SELF_NOT_ALLOWED"
    | "TARGET_NOT_FOUND"
    | "TARGET_BLOCKED"
    | "ALREADY_MEMBER"
    | "GROUP_NAME_REQUIRED"
    | "GROUP_NAME_TOO_LONG"
    | "GROUP_DESCRIPTION_TOO_LONG"
    | "INVALID_PUBLIC_ID"
    | "FRIEND_LOAD_FAILED"
    | "SUBMIT_FAILED";

export type ChatRoomInvitationSuccessCode =
    | "MEMBERS_INVITED"
    | "GROUP_CREATED";

interface UseChatRoomInvitationParams {
    room: ChatRoom | null;
    members: ChatRoomMember[];
    reloadRoom: () => Promise<void>;
    reloadMembers: () => Promise<void>;
}

interface UseChatRoomInvitationResult {
    isOpen: boolean;
    friends: Friend[];
    availableFriends: Friend[];
    selectedFriendUserIds: number[];
    selectedFriends: Friend[];
    publicIdInput: string;
    targetPublicIds: string[];
    groupName: string;
    groupDescription: string;
    isFriendLoading: boolean;
    isSubmitting: boolean;
    errorCode: ChatRoomInvitationErrorCode | null;
    successCode:
        | ChatRoomInvitationSuccessCode
        | null;
    openInvitation: () => void;
    closeInvitation: () => void;
    toggleFriend: (friendUserId: number) => void;
    updatePublicIdInput: (value: string) => void;
    addPublicId: () => boolean;
    removePublicId: (publicId: string) => void;
    updateGroupName: (value: string) => void;
    updateGroupDescription: (value: string) => void;
    submit: () => Promise<boolean>;
    reloadFriends: () => Promise<void>;
    clearSuccess: () => void;
}

function toInvitationErrorCode(
    error: unknown,
): ChatRoomInvitationErrorCode {
    const errorCode = getApiErrorCode(error);

    switch (errorCode) {
        case "CHAT_ROOM_INVITE_TARGET_REQUIRED":
        case "CHAT_ROOM_DIRECT_CONVERSION_TARGET_REQUIRED":
            return "TARGET_REQUIRED";
        case "CHAT_ROOM_INVITE_NOT_ALLOWED":
            return "NOT_ALLOWED";
        case "CHAT_ROOM_INVITE_UNSUPPORTED_ROOM_TYPE":
            return "UNSUPPORTED_ROOM_TYPE";
        case "CHAT_ROOM_INVITE_SELF_NOT_ALLOWED":
            return "SELF_NOT_ALLOWED";
        case "CHAT_ROOM_INVITE_TARGET_NOT_FOUND":
            return "TARGET_NOT_FOUND";
        case "CHAT_ROOM_INVITE_TARGET_BLOCKED":
            return "TARGET_BLOCKED";
        case "CHAT_ROOM_INVITE_ALREADY_MEMBER":
            return "ALREADY_MEMBER";
        case "CHAT_ROOM_GROUP_NAME_REQUIRED":
            return "GROUP_NAME_REQUIRED";
        case "CHAT_ROOM_GROUP_NAME_TOO_LONG":
            return "GROUP_NAME_TOO_LONG";
        case "CHAT_ROOM_GROUP_DESCRIPTION_TOO_LONG":
            return "GROUP_DESCRIPTION_TOO_LONG";
        default:
            return "SUBMIT_FAILED";
    }
}

function normalizePublicId(value: string) {
    return value.trim().toUpperCase();
}

function isValidPublicIdInput(value: string) {
    return (
        value.length >= 4 &&
        value.length <= 64 &&
        !/\s/.test(value) &&
        /^[A-Z0-9-]+$/.test(value)
    );
}

export function useChatRoomInvitation({
    room,
    members,
    reloadRoom,
    reloadMembers,
}: UseChatRoomInvitationParams): UseChatRoomInvitationResult {
    const router = useRouter();

    const [isOpen, setIsOpen] = useState(false);
    const [
        selectedFriendUserIds,
        setSelectedFriendUserIds,
    ] = useState<number[]>([]);
    const [publicIdInput, setPublicIdInput] =
        useState("");
    const [targetPublicIds, setTargetPublicIds] =
        useState<string[]>([]);
    const [groupName, setGroupName] =
        useState("");
    const [groupDescription, setGroupDescription] =
        useState("");
    const [isSubmitting, setIsSubmitting] =
        useState(false);
    const [errorCode, setErrorCode] =
        useState<ChatRoomInvitationErrorCode | null>(
            null,
        );
    const [successCode, setSuccessCode] =
        useState<ChatRoomInvitationSuccessCode | null>(
            null,
        );

    const {
        data: friends = [],
        isLoading: isFriendLoading,
        isError: isFriendError,
        mutate: mutateFriends,
    } = useQuery({
        keys: isOpen
            ? (["chat-room-invitation-friends"] as const)
            : null,
        fetcher: () => friendService.getFriends(),
    });

    const existingMemberUserIdSet = useMemo(
        () =>
            new Set(
                members.map(
                    (member) => member.userId,
                ),
            ),
        [members],
    );

    const existingMemberPublicIdSet = useMemo(
        () =>
            new Set(
                members
                    .map((member) =>
                        member.publicId
                            ?.trim()
                            .toUpperCase(),
                    )
                    .filter(
                        (
                            publicId,
                        ): publicId is string =>
                            Boolean(publicId),
                    ),
            ),
        [members],
    );

    const availableFriends = useMemo(
        () =>
            friends.filter(
                (friend) =>
                    !existingMemberUserIdSet.has(
                        friend.friendUserId,
                    ),
            ),
        [existingMemberUserIdSet, friends],
    );

    const selectedFriendUserIdSet = useMemo(
        () => new Set(selectedFriendUserIds),
        [selectedFriendUserIds],
    );

    const selectedFriends = useMemo(
        () =>
            availableFriends.filter((friend) =>
                selectedFriendUserIdSet.has(
                    friend.friendUserId,
                ),
            ),
        [
            availableFriends,
            selectedFriendUserIdSet,
        ],
    );

    const resetForm = useCallback(() => {
        setSelectedFriendUserIds([]);
        setPublicIdInput("");
        setTargetPublicIds([]);
        setGroupName("");
        setGroupDescription("");
        setErrorCode(null);
    }, []);

    const openInvitation = useCallback(() => {
        resetForm();
        setSuccessCode(null);
        setIsOpen(true);
    }, [resetForm]);

    const closeInvitation = useCallback(() => {
        if (isSubmitting) {
            return;
        }

        setIsOpen(false);
        resetForm();
    }, [isSubmitting, resetForm]);

    const toggleFriend = useCallback(
        (friendUserId: number) => {
            setSelectedFriendUserIds((current) =>
                current.includes(friendUserId)
                    ? current.filter(
                          (id) =>
                              id !== friendUserId,
                      )
                    : [...current, friendUserId],
            );
            setErrorCode(null);
        },
        [],
    );

    const updatePublicIdInput = useCallback(
        (value: string) => {
            setPublicIdInput(value);
            setErrorCode(null);
        },
        [],
    );

    const addPublicId = useCallback(() => {
        const normalized =
            normalizePublicId(publicIdInput);

        if (!isValidPublicIdInput(normalized)) {
            setErrorCode("INVALID_PUBLIC_ID");
            return false;
        }

        if (
            existingMemberPublicIdSet.has(normalized)
        ) {
            setErrorCode("ALREADY_MEMBER");
            return false;
        }

        setTargetPublicIds((current) =>
            current.includes(normalized)
                ? current
                : [...current, normalized],
        );
        setPublicIdInput("");
        setErrorCode(null);
        return true;
    }, [
        existingMemberPublicIdSet,
        publicIdInput,
    ]);

    const removePublicId = useCallback(
        (publicId: string) => {
            setTargetPublicIds((current) =>
                current.filter(
                    (value) => value !== publicId,
                ),
            );
            setErrorCode(null);
        },
        [],
    );

    const updateGroupName = useCallback(
        (value: string) => {
            setGroupName(value);
            setErrorCode(null);
        },
        [],
    );

    const updateGroupDescription = useCallback(
        (value: string) => {
            setGroupDescription(value);
            setErrorCode(null);
        },
        [],
    );

    const reloadFriends = useCallback(async () => {
        await mutateFriends(
            (currentData) => currentData,
            true,
        );
    }, [mutateFriends]);

    const clearSuccess = useCallback(() => {
        setSuccessCode(null);
    }, []);

    const submit = useCallback(async () => {
        if (!room || isSubmitting) {
            return false;
        }

        if (isFriendError) {
            setErrorCode("FRIEND_LOAD_FAILED");
            return false;
        }

        const pendingInput =
            normalizePublicId(publicIdInput);

        if (
            pendingInput &&
            !targetPublicIds.includes(pendingInput)
        ) {
            if (!isValidPublicIdInput(pendingInput)) {
                setErrorCode("INVALID_PUBLIC_ID");
                return false;
            }

            if (
                existingMemberPublicIdSet.has(
                    pendingInput,
                )
            ) {
                setErrorCode("ALREADY_MEMBER");
                return false;
            }
        }

        const nextTargetPublicIds = pendingInput
            ? Array.from(
                  new Set([
                      ...targetPublicIds,
                      pendingInput,
                  ]),
              )
            : targetPublicIds;

        if (
            selectedFriendUserIds.length === 0 &&
            nextTargetPublicIds.length === 0
        ) {
            setErrorCode("TARGET_REQUIRED");
            return false;
        }

        const isDirectConversion =
            room.roomType === "DIRECT" &&
            room.sourceType === "FRIEND";

        if (
            room.roomType !== "GROUP" &&
            !isDirectConversion
        ) {
            setErrorCode(
                "UNSUPPORTED_ROOM_TYPE",
            );
            return false;
        }

        if (
            isDirectConversion &&
            !groupName.trim()
        ) {
            setErrorCode("GROUP_NAME_REQUIRED");
            return false;
        }

        setIsSubmitting(true);
        setErrorCode(null);

        try {
            const response = isDirectConversion
                ? await chatRoomInvitationService
                      .convertDirectToGroup(room.id, {
                          name: groupName.trim(),
                          description:
                              groupDescription.trim() ||
                              null,
                          targetUserIds:
                              selectedFriendUserIds,
                          targetPublicIds:
                              nextTargetPublicIds,
                      })
                : await chatRoomMemberService
                      .inviteMembers(room.id, {
                          targetUserIds:
                              selectedFriendUserIds,
                          targetPublicIds:
                              nextTargetPublicIds,
                      });

            if (response.createdNewGroupRoom) {
                setSuccessCode("GROUP_CREATED");
                setIsOpen(false);
                resetForm();

                router.push(
                    `/chat/rooms/${response.roomId}`,
                );
                return true;
            }

            await Promise.all([
                reloadRoom(),
                reloadMembers(),
            ]);

            setSuccessCode("MEMBERS_INVITED");
            setIsOpen(false);
            resetForm();
            return true;
        } catch (error) {
            console.error(
                "Failed to invite chat room members.",
                error,
            );
            setErrorCode(
                toInvitationErrorCode(error),
            );
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, [
        existingMemberPublicIdSet,
        groupDescription,
        groupName,
        isFriendError,
        isSubmitting,
        publicIdInput,
        reloadMembers,
        reloadRoom,
        resetForm,
        room,
        router,
        selectedFriendUserIds,
        targetPublicIds,
    ]);

    return {
        isOpen,
        friends,
        availableFriends,
        selectedFriendUserIds,
        selectedFriends,
        publicIdInput,
        targetPublicIds,
        groupName,
        groupDescription,
        isFriendLoading,
        isSubmitting,
        errorCode:
            isFriendError && !errorCode
                ? "FRIEND_LOAD_FAILED"
                : errorCode,
        successCode,
        openInvitation,
        closeInvitation,
        toggleFriend,
        updatePublicIdInput,
        addPublicId,
        removePublicId,
        updateGroupName,
        updateGroupDescription,
        submit,
        reloadFriends,
        clearSuccess,
    };
}
