import type { FriendListActionErrorCode } from "@/hooks/friends/useFriendList";

type FriendListMessageErrorCode = Exclude<
    FriendListActionErrorCode,
    "LOAD_FAILED"
>;

export type FriendListErrorMessageKey =
    | "messages.startChatFailed"
    | "messages.startChatBlocked"
    | "messages.startChatRelationRequired"
    | "messages.startChatSelfNotAllowed"
    | "messages.startChatInvalidResponse"
    | "messages.groupEntryFailed"
    | "messages.deleteFriendFailed"
    | "messages.blockFriendFailed"
    | "messages.unblockFriendFailed"
    | "messages.blockedUserActionDenied";

export const FRIEND_LIST_ACTION_ERROR_MESSAGE_KEYS = {
    START_CHAT_FAILED: "messages.startChatFailed",
    START_CHAT_BLOCKED: "messages.startChatBlocked",
    START_CHAT_RELATION_REQUIRED: "messages.startChatRelationRequired",
    START_CHAT_SELF_NOT_ALLOWED: "messages.startChatSelfNotAllowed",
    START_CHAT_INVALID_RESPONSE: "messages.startChatInvalidResponse",
    GROUP_ENTRY_FAILED: "messages.groupEntryFailed",
    DELETE_FRIEND_FAILED: "messages.deleteFriendFailed",
    BLOCK_FRIEND_FAILED: "messages.blockFriendFailed",
    UNBLOCK_FRIEND_FAILED: "messages.unblockFriendFailed",
    BLOCKED_USER_ACTION_DENIED: "messages.blockedUserActionDenied",
} as const satisfies Record<
    FriendListMessageErrorCode,
    FriendListErrorMessageKey
>;
