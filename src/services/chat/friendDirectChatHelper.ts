"use client";

import { getApiErrorCode } from "@/services/common/responseParser";
import type { FriendDirectChatRoomResponse } from "@/types/social";

export type FriendDirectChatStartErrorCode =
    | "START_CHAT_FAILED"
    | "START_CHAT_BLOCKED"
    | "START_CHAT_RELATION_REQUIRED"
    | "START_CHAT_SELF_NOT_ALLOWED"
    | "START_CHAT_INVALID_RESPONSE";

type FriendDirectChatRoomResponseWithLegacyId =
    FriendDirectChatRoomResponse & {
        /**
         * #26 이슈 본문에는 chatRoomId 기준 이동이 기재되어 있다.
         * 현재 BE ChatRoomResponseDto는 id를 반환하지만, 응답 구조가 바뀌어도
         * FE 이동 처리가 깨지지 않도록 chatRoomId도 허용한다.
         */
        chatRoomId?: number | null;
    };

export class FriendDirectChatInvalidResponseError extends Error {
    constructor() {
        super("Friend direct chat room response does not contain a valid room id.");
        this.name = "FriendDirectChatInvalidResponseError";
    }
}

export function getFriendDirectChatRoomId(
    room: FriendDirectChatRoomResponseWithLegacyId,
): number {
    const roomId =
        typeof room.chatRoomId === "number" ? room.chatRoomId : room.id;

    if (!Number.isSafeInteger(roomId) || roomId <= 0) {
        throw new FriendDirectChatInvalidResponseError();
    }

    return roomId;
}

export function toFriendDirectChatStartErrorCode(
    error: unknown,
): FriendDirectChatStartErrorCode {
    if (error instanceof FriendDirectChatInvalidResponseError) {
        return "START_CHAT_INVALID_RESPONSE";
    }

    const errorCode = getApiErrorCode(error);

    if (errorCode === "USER_BLOCKED_BETWEEN") {
        return "START_CHAT_BLOCKED";
    }

    if (errorCode === "FRIEND_RELATION_REQUIRED") {
        return "START_CHAT_RELATION_REQUIRED";
    }

    if (errorCode === "FRIEND_CHAT_SELF_NOT_ALLOWED") {
        return "START_CHAT_SELF_NOT_ALLOWED";
    }

    return "START_CHAT_FAILED";
}
