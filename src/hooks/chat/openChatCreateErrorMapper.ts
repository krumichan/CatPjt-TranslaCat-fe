import { getApiErrorCode } from "@/services/common/responseParser";
import type {
    OpenChatCreateRoomField,
    OpenChatCreateRoomValidationError,
} from "@/hooks/chat/openChatCreateTypes";

export interface OpenChatCreateApiErrorResult {
    roomField?: OpenChatCreateRoomField;
    roomError?: OpenChatCreateRoomValidationError;
    profileError?: string;
}

export function mapOpenChatCreateApiError(
    error: unknown,
): OpenChatCreateApiErrorResult {
    switch (getApiErrorCode(error)) {
        case "OPEN_CHAT_NAME_REQUIRED":
            return { roomField: "name", roomError: "NAME_REQUIRED" };
        case "OPEN_CHAT_NAME_TOO_LONG":
            return { roomField: "name", roomError: "NAME_TOO_LONG" };
        case "OPEN_CHAT_DESCRIPTION_REQUIRED":
            return {
                roomField: "description",
                roomError: "DESCRIPTION_REQUIRED",
            };
        case "OPEN_CHAT_DESCRIPTION_TOO_LONG":
            return {
                roomField: "description",
                roomError: "DESCRIPTION_TOO_LONG",
            };
        case "OPEN_CHAT_VISIBILITY_REQUIRED":
            return {
                roomField: "visibility",
                roomError: "VISIBILITY_REQUIRED",
            };
        case "OPEN_CHAT_MAX_MEMBER_COUNT_INVALID":
            return {
                roomField: "maxMemberCount",
                roomError: "MAX_MEMBER_COUNT_INVALID",
            };
        case "OPEN_CHAT_NICKNAME_REQUIRED":
            return { profileError: "NICKNAME_REQUIRED" };
        case "OPEN_CHAT_NICKNAME_TOO_LONG":
            return { profileError: "NICKNAME_TOO_LONG" };
        case "PROFILE_IMAGE_FILE_TOO_LARGE":
            return { profileError: "FILE_TOO_LARGE" };
        case "PROFILE_IMAGE_UNSUPPORTED_CONTENT_TYPE":
        case "PROFILE_IMAGE_CONTENT_TYPE_MISMATCH":
        case "PROFILE_IMAGE_INVALID_BINARY":
            return { profileError: "UNSUPPORTED_TYPE" };
        default:
            return {};
    }
}
