"use client";

import { useCallback, useState } from "react";

import { useRouter } from "@/navigation";
import { friendChatService } from "@/services/chat/friendChatService";
import { getApiErrorCode } from "@/services/common/responseParser";
import { friendRequestService } from "@/services/friend/friendRequestService";
import { userBlockService } from "@/services/block/userBlockService";
import { userSearchService } from "@/services/user/userSearchService";
import type {
    UserSearchFriendStatus,
    UserSearchResult,
} from "@/types/social";

export type UserSearchErrorCode =
    | "PUBLIC_ID_REQUIRED"
    | "NOT_FOUND"
    | "SEARCH_FAILED";

export type UserSearchActionErrorCode =
    | "SEND_REQUEST_FAILED"
    | "REQUEST_ALREADY_PENDING"
    | "ALREADY_FRIEND"
    | "BLOCKED"
    | "SELF"
    | "TARGET_NOT_FOUND"
    | "START_CHAT_FAILED"
    | "BLOCK_USER_FAILED";

export type UserSearchActionSuccessCode =
    | "REQUEST_SENT"
    | "USER_BLOCKED";

interface UsePublicIdUserSearchResult {
    publicId: string;
    result: UserSearchResult | null;
    isSearching: boolean;
    isSendingRequest: boolean;
    isStartingChat: boolean;
    isBlockingUser: boolean;
    hasSearched: boolean;
    searchErrorCode: UserSearchErrorCode | null;
    actionErrorCode: UserSearchActionErrorCode | null;
    actionSuccessCode: UserSearchActionSuccessCode | null;
    updatePublicId: (value: string) => void;
    search: () => Promise<boolean>;
    sendFriendRequest: () => Promise<boolean>;
    startDirectChat: () => Promise<boolean>;
    blockUser: () => Promise<boolean>;
    clearResult: () => void;
}

function toSearchErrorCode(error: unknown): UserSearchErrorCode {
    const errorCode = getApiErrorCode(error);

    if (errorCode === "PUBLIC_ID_NOT_FOUND") {
        return "NOT_FOUND";
    }

    if (errorCode === "PUBLIC_ID_REQUIRED") {
        return "PUBLIC_ID_REQUIRED";
    }

    return "SEARCH_FAILED";
}

function toFriendRequestActionErrorCode(
    error: unknown,
): UserSearchActionErrorCode {
    const errorCode = getApiErrorCode(error);

    if (errorCode === "FRIEND_REQUEST_ALREADY_PENDING") {
        return "REQUEST_ALREADY_PENDING";
    }

    if (errorCode === "FRIEND_ALREADY_EXISTS") {
        return "ALREADY_FRIEND";
    }

    if (errorCode === "USER_BLOCKED_BETWEEN") {
        return "BLOCKED";
    }

    if (errorCode === "FRIEND_REQUEST_SELF_NOT_ALLOWED") {
        return "SELF";
    }

    if (
        errorCode === "PUBLIC_ID_NOT_FOUND" ||
        errorCode === "USER_NOT_FOUND"
    ) {
        return "TARGET_NOT_FOUND";
    }

    return "SEND_REQUEST_FAILED";
}

function toFriendStatusByActionError(
    actionErrorCode: UserSearchActionErrorCode,
): UserSearchFriendStatus | null {
    if (actionErrorCode === "REQUEST_ALREADY_PENDING") {
        return "REQUEST_SENT";
    }

    if (actionErrorCode === "ALREADY_FRIEND") {
        return "FRIEND";
    }

    if (actionErrorCode === "BLOCKED") {
        return "BLOCKED";
    }

    if (actionErrorCode === "SELF") {
        return "SELF";
    }

    return null;
}

export function usePublicIdUserSearch(): UsePublicIdUserSearchResult {
    const router = useRouter();

    const [publicId, setPublicId] = useState("");
    const [result, setResult] = useState<UserSearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const [isStartingChat, setIsStartingChat] = useState(false);
    const [isBlockingUser, setIsBlockingUser] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchErrorCode, setSearchErrorCode] =
        useState<UserSearchErrorCode | null>(null);
    const [actionErrorCode, setActionErrorCode] =
        useState<UserSearchActionErrorCode | null>(null);
    const [actionSuccessCode, setActionSuccessCode] =
        useState<UserSearchActionSuccessCode | null>(null);

    const updatePublicId = useCallback((value: string) => {
        setPublicId(value);
        setSearchErrorCode(null);
        setActionErrorCode(null);
        setActionSuccessCode(null);
    }, []);

    const clearResult = useCallback(() => {
        setResult(null);
        setHasSearched(false);
        setSearchErrorCode(null);
        setActionErrorCode(null);
        setActionSuccessCode(null);
    }, []);

    const search = useCallback(async () => {
        const trimmedPublicId = publicId.trim();

        setHasSearched(true);
        setActionErrorCode(null);
        setActionSuccessCode(null);

        if (!trimmedPublicId) {
            setResult(null);
            setSearchErrorCode("PUBLIC_ID_REQUIRED");
            return false;
        }

        setIsSearching(true);
        setSearchErrorCode(null);

        try {
            const searchedUser =
                await userSearchService.searchByPublicId(trimmedPublicId);

            setResult(searchedUser);
            return true;
        } catch (error) {
            console.error("Failed to search user by publicId.", error);
            setResult(null);
            setSearchErrorCode(toSearchErrorCode(error));
            return false;
        } finally {
            setIsSearching(false);
        }
    }, [publicId]);

    const sendFriendRequest = useCallback(async () => {
        if (!result || isSendingRequest) {
            return false;
        }

        setIsSendingRequest(true);
        setActionErrorCode(null);
        setActionSuccessCode(null);

        try {
            await friendRequestService.sendFriendRequest({
                receiverPublicId: result.publicId,
            });

            setResult({
                ...result,
                friendStatus: "REQUEST_SENT",
            });
            setActionSuccessCode("REQUEST_SENT");
            return true;
        } catch (error) {
            console.error("Failed to send friend request.", error);

            const nextActionErrorCode =
                toFriendRequestActionErrorCode(error);
            const nextFriendStatus =
                toFriendStatusByActionError(nextActionErrorCode);

            if (nextFriendStatus) {
                setResult({
                    ...result,
                    friendStatus: nextFriendStatus,
                });
            }

            setActionErrorCode(nextActionErrorCode);
            return false;
        } finally {
            setIsSendingRequest(false);
        }
    }, [isSendingRequest, result]);

    const startDirectChat = useCallback(async () => {
        if (!result || isStartingChat) {
            return false;
        }

        setIsStartingChat(true);
        setActionErrorCode(null);
        setActionSuccessCode(null);

        try {
            const room = await friendChatService.createOrGetDirectRoom(
                result.userId,
            );

            router.push(`/chat/rooms/${room.id}`);
            return true;
        } catch (error) {
            console.error("Failed to start friend direct chat.", error);
            setActionErrorCode("START_CHAT_FAILED");
            return false;
        } finally {
            setIsStartingChat(false);
        }
    }, [isStartingChat, result, router]);

    const blockUser = useCallback(async () => {
        if (
            !result ||
            isBlockingUser ||
            result.friendStatus === "SELF" ||
            result.friendStatus === "BLOCKED"
        ) {
            return false;
        }

        setIsBlockingUser(true);
        setActionErrorCode(null);
        setActionSuccessCode(null);

        try {
            await userBlockService.blockUser({
                blockedPublicId: result.publicId,
            });

            setResult({
                ...result,
                friendStatus: "BLOCKED",
            });
            setActionSuccessCode("USER_BLOCKED");
            return true;
        } catch (error) {
            console.error("Failed to block user.", error);
            setActionErrorCode("BLOCK_USER_FAILED");
            return false;
        } finally {
            setIsBlockingUser(false);
        }
    }, [isBlockingUser, result]);

    return {
        publicId,
        result,
        isSearching,
        isSendingRequest,
        isStartingChat,
        isBlockingUser,
        hasSearched,
        searchErrorCode,
        actionErrorCode,
        actionSuccessCode,
        updatePublicId,
        search,
        sendFriendRequest,
        startDirectChat,
        blockUser,
        clearResult,
    };
}
