"use client";

import { useCallback, useState } from "react";

import { useRouter } from "@/navigation";
import { friendChatService } from "@/services/chat/friendChatService";
import { friendRequestService } from "@/services/friend/friendRequestService";
import { getApiErrorCode } from "@/services/common/responseParser";
import { userSearchService } from "@/services/user/userSearchService";
import type { UserSearchResult } from "@/types/social";

export type UserSearchErrorCode =
    | "PUBLIC_ID_REQUIRED"
    | "NOT_FOUND"
    | "SEARCH_FAILED";

export type UserSearchActionErrorCode =
    | "SEND_REQUEST_FAILED"
    | "START_CHAT_FAILED";

export type UserSearchActionSuccessCode =
    | "REQUEST_SENT";

interface UsePublicIdUserSearchResult {
    publicId: string;
    result: UserSearchResult | null;
    isSearching: boolean;
    isSendingRequest: boolean;
    isStartingChat: boolean;
    hasSearched: boolean;
    searchErrorCode: UserSearchErrorCode | null;
    actionErrorCode: UserSearchActionErrorCode | null;
    actionSuccessCode: UserSearchActionSuccessCode | null;
    updatePublicId: (value: string) => void;
    search: () => Promise<boolean>;
    sendFriendRequest: () => Promise<boolean>;
    startDirectChat: () => Promise<boolean>;
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

export function usePublicIdUserSearch(): UsePublicIdUserSearchResult {
    const router = useRouter();

    const [publicId, setPublicId] = useState("");
    const [result, setResult] = useState<UserSearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const [isStartingChat, setIsStartingChat] = useState(false);
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
        if (!result) {
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
            setActionErrorCode("SEND_REQUEST_FAILED");
            return false;
        } finally {
            setIsSendingRequest(false);
        }
    }, [result]);

    const startDirectChat = useCallback(async () => {
        if (!result) {
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
    }, [result, router]);

    return {
        publicId,
        result,
        isSearching,
        isSendingRequest,
        isStartingChat,
        hasSearched,
        searchErrorCode,
        actionErrorCode,
        actionSuccessCode,
        updatePublicId,
        search,
        sendFriendRequest,
        startDirectChat,
        clearResult,
    };
}
