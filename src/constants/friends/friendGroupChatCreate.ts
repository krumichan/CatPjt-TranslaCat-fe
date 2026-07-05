export const FRIEND_GROUP_CHAT_CREATE_ERROR_CODE = {
    SELECTION_REQUIRED: "SELECTION_REQUIRED",
    NAME_REQUIRED: "NAME_REQUIRED",
    SELECTION_ADJUSTED: "SELECTION_ADJUSTED",
    LOAD_FAILED: "LOAD_FAILED",
    CREATE_FAILED: "CREATE_FAILED",
} as const;

export type FriendGroupChatCreateErrorCode =
    (typeof FRIEND_GROUP_CHAT_CREATE_ERROR_CODE)[keyof typeof FRIEND_GROUP_CHAT_CREATE_ERROR_CODE];

export type FriendGroupErrorMessageKey =
    | "messages.selectionRequired"
    | "messages.nameRequired"
    | "messages.selectionAdjusted"
    | "messages.createFailed";

export const FRIEND_GROUP_ERROR_MESSAGE_KEYS: Record<
    FriendGroupChatCreateErrorCode,
    FriendGroupErrorMessageKey | null
> = {
    SELECTION_REQUIRED: "messages.selectionRequired",
    NAME_REQUIRED: "messages.nameRequired",
    SELECTION_ADJUSTED: "messages.selectionAdjusted",
    LOAD_FAILED: null,
    CREATE_FAILED: "messages.createFailed",
};
