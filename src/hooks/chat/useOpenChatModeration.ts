"use client";

import { useCallback, useRef, useState } from "react";

import { getApiErrorCode } from "@/services/common/responseParser";
import { openChatService } from "@/services/chat/openChatService";
import type { OpenChatMemberProfile } from "@/types/chat";
import type { OpenChatModerationAction } from "@/utils/chat/openChatModeration";

export type OpenChatModerationErrorCode =
    | "REASON_REQUIRED"
    | "REASON_TOO_LONG"
    | "ACCESS_CHANGED"
    | "TARGET_CHANGED"
    | "ALREADY_BANNED"
    | "ROOM_CLOSED"
    | "ACTION_FAILED";

interface UseOpenChatModerationParams {
    roomId: number;
    onMemberUpdated: (profile: OpenChatMemberProfile) => Promise<void>;
    onMemberRemoved: (openChatMemberId: number) => Promise<void>;
    onReloadState: () => Promise<void>;
}

const CONFLICT_ERROR_CODES = new Set([
    "OPEN_CHAT_MODERATION_ACCESS_DENIED",
    "OPEN_CHAT_OWNER_ONLY",
    "OPEN_CHAT_ADMIN_TARGET_INVALID",
    "OPEN_CHAT_BAN_TARGET_INVALID",
    "OPEN_CHAT_BAN_SELF_NOT_ALLOWED",
    "OPEN_CHAT_BAN_ROLE_FORBIDDEN",
    "OPEN_CHAT_BAN_ALREADY_ACTIVE",
    "OPEN_CHAT_ROOM_CLOSED",
]);

function mapModerationError(error: unknown): OpenChatModerationErrorCode {
    switch (getApiErrorCode(error)) {
        case "OPEN_CHAT_BAN_REASON_REQUIRED":
        case "OPEN_CHAT_BAN_REQUEST_REQUIRED":
            return "REASON_REQUIRED";
        case "OPEN_CHAT_BAN_REASON_TOO_LONG":
            return "REASON_TOO_LONG";
        case "OPEN_CHAT_MODERATION_ACCESS_DENIED":
        case "OPEN_CHAT_OWNER_ONLY":
            return "ACCESS_CHANGED";
        case "OPEN_CHAT_ADMIN_TARGET_INVALID":
        case "OPEN_CHAT_BAN_TARGET_INVALID":
        case "OPEN_CHAT_BAN_SELF_NOT_ALLOWED":
        case "OPEN_CHAT_BAN_ROLE_FORBIDDEN":
            return "TARGET_CHANGED";
        case "OPEN_CHAT_BAN_ALREADY_ACTIVE":
            return "ALREADY_BANNED";
        case "OPEN_CHAT_ROOM_CLOSED":
            return "ROOM_CLOSED";
        default:
            return "ACTION_FAILED";
    }
}

export function useOpenChatModeration({
    roomId,
    onMemberUpdated,
    onMemberRemoved,
    onReloadState,
}: UseOpenChatModerationParams) {
    const submitLockRef = useRef(false);
    const [action, setAction] =
        useState<OpenChatModerationAction | null>(null);
    const [target, setTarget] =
        useState<OpenChatMemberProfile | null>(null);
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorCode, setErrorCode] =
        useState<OpenChatModerationErrorCode | null>(null);

    const open = useCallback(
        (
            nextAction: OpenChatModerationAction,
            nextTarget: OpenChatMemberProfile,
        ) => {
            setAction(nextAction);
            setTarget(nextTarget);
            setReason("");
            setErrorCode(null);
        },
        [],
    );

    const close = useCallback(() => {
        if (isSubmitting) {
            return;
        }
        setAction(null);
        setTarget(null);
        setReason("");
        setErrorCode(null);
    }, [isSubmitting]);

    const updateReason = useCallback((value: string) => {
        setReason(value);
        setErrorCode((current) =>
            current === "REASON_REQUIRED" || current === "REASON_TOO_LONG"
                ? null
                : current,
        );
    }, []);

    const submit = useCallback(async () => {
        if (!action || !target || submitLockRef.current) {
            return false;
        }

        const normalizedReason = reason.trim();
        if (action === "BAN") {
            if (!normalizedReason) {
                setErrorCode("REASON_REQUIRED");
                return false;
            }
            if (normalizedReason.length > 500) {
                setErrorCode("REASON_TOO_LONG");
                return false;
            }
        }

        submitLockRef.current = true;
        setIsSubmitting(true);
        setErrorCode(null);

        try {
            if (action === "ASSIGN_ADMIN") {
                const profile = await openChatService.assignAdmin(
                    roomId,
                    target.openChatMemberId,
                );
                await onMemberUpdated(profile);
            } else if (action === "REVOKE_ADMIN") {
                const profile = await openChatService.revokeAdmin(
                    roomId,
                    target.openChatMemberId,
                );
                await onMemberUpdated(profile);
            } else {
                await openChatService.banMember(roomId, {
                    targetOpenChatMemberId: target.openChatMemberId,
                    reason: normalizedReason,
                });
                await onMemberRemoved(target.openChatMemberId);
            }

            setAction(null);
            setTarget(null);
            setReason("");
            return true;
        } catch (error) {
            console.error("Failed to moderate OPEN chat member.", error);
            const apiErrorCode = getApiErrorCode(error);
            setErrorCode(mapModerationError(error));

            if (apiErrorCode && CONFLICT_ERROR_CODES.has(apiErrorCode)) {
                await onReloadState();
            }
            return false;
        } finally {
            submitLockRef.current = false;
            setIsSubmitting(false);
        }
    }, [
        action,
        onMemberRemoved,
        onMemberUpdated,
        onReloadState,
        reason,
        roomId,
        target,
    ]);

    return {
        action,
        target,
        reason,
        isOpen: action !== null && target !== null,
        isSubmitting,
        errorCode,
        open,
        close,
        updateReason,
        submit,
    };
}
