"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorCode, ApiResponseError } from "@/services/common/responseParser";
import { openChatInvitationService } from "@/services/chat/openChatInvitationService";

export type OpenChatIdInvitationErrorCode =
    | "INVALID_ID"
    | "NOT_ALLOWED"
    | "TARGET_UNAVAILABLE"
    | "RATE_LIMITED"
    | "REQUEST_CONFLICT"
    | "INVALID_REQUEST"
    | "ROOM_CLOSED"
    | "UNAVAILABLE"
    | "FAILED";

type OpenChatIdInvitationSuccessCode = "SENT" | "ALREADY_SENT";
const SEND_TIMEOUT_MS = 15_000;
const PENDING_ATTEMPT_TTL_MS = 30 * 60_000;
const MAX_PENDING_ATTEMPTS = 256;
const pendingAttempts = new Map<string, { requestId: string; expiresAt: number }>();

function getPendingAttempt(scopeKey: string, targetPublicId: string): {
    key: string;
    requestId: string;
} {
    const now = Date.now();
    for (const [key, attempt] of pendingAttempts) {
        if (attempt.expiresAt <= now) {
            pendingAttempts.delete(key);
        }
    }

    // 모듈 수명 동안 계정·방·정확한 ID의 결과불명 시도를 재사용한다.
    const key = JSON.stringify([scopeKey, targetPublicId]);
    const requestId = pendingAttempts.get(key)?.requestId ?? crypto.randomUUID();
    pendingAttempts.delete(key);
    pendingAttempts.set(key, {
        requestId,
        expiresAt: now + PENDING_ATTEMPT_TTL_MS,
    });

    while (pendingAttempts.size > MAX_PENDING_ATTEMPTS) {
        const oldestKey = pendingAttempts.keys().next().value;
        if (oldestKey === undefined) {
            break;
        }
        pendingAttempts.delete(oldestKey);
    }

    return { key, requestId };
}

function clearPendingAttempt(key: string, requestId: string): void {
    if (pendingAttempts.get(key)?.requestId === requestId) {
        pendingAttempts.delete(key);
    }
}

function mapInvitationError(error: unknown): OpenChatIdInvitationErrorCode {
    const code = getApiErrorCode(error);

    if (code === "OPEN_INVITATION_TARGET_UNAVAILABLE") {
        return "TARGET_UNAVAILABLE";
    }
    if (code === "OPEN_INVITATION_RATE_LIMITED") {
        return "RATE_LIMITED";
    }
    if (code === "OPEN_INVITATION_REQUEST_CONFLICT") {
        return "REQUEST_CONFLICT";
    }
    if (code === "OPEN_INVITATION_INVALID_REQUEST") {
        return "INVALID_REQUEST";
    }
    if (code === "OPEN_INVITATION_ROOM_CLOSED") {
        return "ROOM_CLOSED";
    }
    if (
        code === "OPEN_INVITATION_NOT_ALLOWED" ||
        code === "OPEN_INVITATION_MEMBER_ACCESS_DENIED"
    ) {
        return "NOT_ALLOWED";
    }
    if (error instanceof ApiResponseError && error.status === 503) {
        return "UNAVAILABLE";
    }
    if (error instanceof ApiResponseError && error.status === 401) {
        return "NOT_ALLOWED";
    }
    return "FAILED";
}

export function useOpenChatIdInvitation(roomId: number, canInvite: boolean) {
    const { data: session } = useSession();
    const loginSessionId = session?.loginSessionId ?? null;
    const scopeKey = loginSessionId ? `${loginSessionId}:${roomId}` : null;
    const submitLockRef = useRef(false);
    const requestAbortRef = useRef<AbortController | null>(null);
    const scopeRef = useRef(scopeKey);
    const scopeVersionRef = useRef(0);
    const mountedRef = useRef(false);
    const [isOpen, setIsOpen] = useState(false);
    const [targetPublicId, setTargetPublicId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorCode, setErrorCode] = useState<OpenChatIdInvitationErrorCode | null>(null);
    const [successCode, setSuccessCode] = useState<OpenChatIdInvitationSuccessCode | null>(null);

    useEffect(() => {
        // 계정·방·참여 권한이 바뀌면 이전 요청을 취소하고 늦은 결과를 화면에 반영하지 않는다.
        mountedRef.current = true;
        scopeRef.current = scopeKey;
        ++scopeVersionRef.current;
        setIsOpen(false);
        setTargetPublicId("");
        setIsSubmitting(false);
        setErrorCode(null);
        setSuccessCode(null);

        return () => {
            mountedRef.current = false;
            requestAbortRef.current?.abort();
            requestAbortRef.current = null;
            submitLockRef.current = false;
        };
    }, [scopeKey, canInvite]);

    const open = useCallback(() => {
        if (!canInvite || scopeKey === null) {
            return;
        }

        setErrorCode(null);
        setSuccessCode(null);
        setIsOpen(true);
    }, [canInvite, scopeKey]);

    const close = useCallback(() => {
        if (!submitLockRef.current) {
            setIsOpen(false);
        }
    }, []);

    const updateTarget = useCallback((value: string) => {
        // 불확실하게 끝난 시도는 다른 ID를 입력해도 해당 ID의 UUID를 보존한다.
        setTargetPublicId(value);
        setErrorCode(null);
        setSuccessCode(null);
    }, []);

    const submit = useCallback(async (): Promise<boolean> => {
        if (
            submitLockRef.current ||
            !canInvite ||
            loginSessionId === null ||
            scopeKey === null ||
            scopeRef.current !== scopeKey
        ) {
            setErrorCode("NOT_ALLOWED");
            return false;
        }

        // 기존 검색 계약과 같이 공백만 제거하고 대소문자를 보존한다.
        const normalizedId = targetPublicId.trim();
        if (normalizedId.length === 0 || normalizedId.length > 255) {
            setErrorCode("INVALID_ID");
            return false;
        }

        const { key: attemptKey, requestId } = getPendingAttempt(
            scopeKey,
            normalizedId,
        );
        const scopeVersion = scopeVersionRef.current;
        const abortController = new AbortController();
        requestAbortRef.current = abortController;
        const timeout = window.setTimeout(() => abortController.abort(), SEND_TIMEOUT_MS);
        submitLockRef.current = true;
        setIsSubmitting(true);
        setErrorCode(null);
        setSuccessCode(null);

        try {
            // 전송은 버튼을 누를 때 한 번만 수행한다. 실패해도 자동 재전송하지 않는다.
            const result = await openChatInvitationService.send(
                roomId,
                normalizedId,
                requestId,
                loginSessionId,
                abortController.signal,
            );

            if (
                !mountedRef.current ||
                scopeRef.current !== scopeKey ||
                scopeVersionRef.current !== scopeVersion
            ) {
                return false;
            }

            setSuccessCode(result.duplicate ? "ALREADY_SENT" : "SENT");
            setTargetPublicId("");
            clearPendingAttempt(attemptKey, requestId);
            return true;
        } catch (error) {
            if (
                mountedRef.current &&
                scopeRef.current === scopeKey &&
                scopeVersionRef.current === scopeVersion
            ) {
                setErrorCode(
                    abortController.signal.aborted ? "UNAVAILABLE" : mapInvitationError(error),
                );
            }
            return false;
        } finally {
            window.clearTimeout(timeout);
            if (requestAbortRef.current === abortController) {
                requestAbortRef.current = null;
            }
            if (
                mountedRef.current &&
                scopeRef.current === scopeKey &&
                scopeVersionRef.current === scopeVersion
            ) {
                submitLockRef.current = false;
                setIsSubmitting(false);
            }
        }
    }, [canInvite, loginSessionId, roomId, scopeKey, targetPublicId]);

    return {
        isOpen,
        targetPublicId,
        isSubmitting,
        errorCode,
        successCode,
        open,
        close,
        updateTarget,
        submit,
    };
}
