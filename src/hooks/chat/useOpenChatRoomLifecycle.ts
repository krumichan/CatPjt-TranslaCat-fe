"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "@/navigation";
import { getApiErrorCode } from "@/services/common/responseParser";
import { openChatService } from "@/services/chat/openChatService";
import type {
    ChatRoom,
    OpenChatMemberProfile,
    OpenChatRoomDetail,
} from "@/types/chat";
import { invalidateOpenChatRoomListCache } from "@/utils/chat/openChatCache";

export type OpenChatLifecycleAction =
    | "LEAVE"
    | "TRANSFER_AND_LEAVE"
    | "CLOSE";

export type OpenChatLifecycleDialogMode =
    | OpenChatLifecycleAction
    | "TRANSFER"
    | "CLOSED_NOTICE"
    | null;

export type OpenChatLifecycleErrorCode =
    | "TARGET_REQUIRED"
    | "TARGET_UNAVAILABLE"
    | "ROOM_CLOSED"
    | "ACCESS_DENIED"
    | "LEAVE_FAILED_AFTER_TRANSFER"
    | "ACTION_FAILED";

interface UseOpenChatRoomLifecycleParams {
    roomId: number;
    room: ChatRoom | null;
    openMembers: OpenChatMemberProfile[];
    isMembersLoading: boolean;
    membersLoadErrorCode: string | null;
    onCloseRoomMenu: () => void;
    onRefreshState: () => Promise<void>;
    onOwnerTransferred: (
        detail: OpenChatRoomDetail,
        targetOpenChatMemberId: number,
        isCurrentScope: () => boolean,
    ) => Promise<void>;
}

interface UseOpenChatRoomLifecycleResult {
    action: OpenChatLifecycleAction | null;
    canTransferOwner: boolean;
    dialogMode: OpenChatLifecycleDialogMode;
    candidates: OpenChatMemberProfile[];
    selectedTargetId: number | null;
    isSubmitting: boolean;
    errorCode: OpenChatLifecycleErrorCode | null;
    isRoomClosed: boolean;
    openActionDialog: () => void;
    openTransferDialog: () => void;
    closeDialog: () => void;
    selectTarget: (openChatMemberId: number) => void;
    submit: () => Promise<boolean>;
    handleRemoteClosed: () => void;
    acknowledgeClosed: () => void;
}

function mapLifecycleError(error: unknown): OpenChatLifecycleErrorCode {
    const errorCode = getApiErrorCode(error);

    if (errorCode === "OPEN_CHAT_ROOM_CLOSED") {
        return "ROOM_CLOSED";
    }
    if (errorCode === "OWNER_TRANSFER_TARGET_REQUIRED") {
        return "TARGET_REQUIRED";
    }
    if (errorCode === "OWNER_TRANSFER_TARGET_INVALID") {
        return "TARGET_UNAVAILABLE";
    }
    if (
        errorCode === "OPEN_CHAT_OWNER_ONLY" ||
        errorCode === "OPEN_CHAT_MEMBER_ACCESS_DENIED"
    ) {
        return "ACCESS_DENIED";
    }
    return "ACTION_FAILED";
}

export function useOpenChatRoomLifecycle({
    roomId,
    room,
    openMembers,
    isMembersLoading,
    membersLoadErrorCode,
    onCloseRoomMenu,
    onRefreshState,
    onOwnerTransferred,
}: UseOpenChatRoomLifecycleParams): UseOpenChatRoomLifecycleResult {
    const router = useRouter();
    const { data: session } = useSession();
    const loginSessionId = session?.loginSessionId ?? null;
    const scopeKey = loginSessionId ? `${loginSessionId}:${roomId}` : null;
    const scopeRef = useRef(scopeKey);
    const scopeVersionRef = useRef(0);
    const transferAbortRef = useRef<AbortController | null>(null);
    const mountedRef = useRef(false);
    const submitLockRef = useRef(false);
    const [dialogMode, setDialogMode] =
        useState<OpenChatLifecycleDialogMode>(null);
    const [selectedTargetId, setSelectedTargetId] =
        useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorCode, setErrorCode] =
        useState<OpenChatLifecycleErrorCode | null>(null);
    const [isRoomClosed, setIsRoomClosed] = useState(false);
    const [hasTransferredOwner, setHasTransferredOwner] = useState(false);

    useEffect(() => {
        // 계정이나 방이 바뀌면 이전 확인창과 늦은 위임 응답을 새 화면에 적용하지 않는다.
        mountedRef.current = true;
        scopeRef.current = scopeKey;
        ++scopeVersionRef.current;
        setDialogMode(null);
        setSelectedTargetId(null);
        setErrorCode(null);
        setIsSubmitting(false);
        setHasTransferredOwner(false);
        setIsRoomClosed(false);

        return () => {
            mountedRef.current = false;
            transferAbortRef.current?.abort();
            transferAbortRef.current = null;
            submitLockRef.current = false;
        };
    }, [scopeKey]);

    // OPEN 멤버 목록에는 AI 멤버가 없으며, 활성 사람 멤버만 위임 대상으로 둔다.
    const candidates = openMembers.filter(
        (member) => member.active && member.role !== "OWNER",
    );
    const canTransferOwner =
        room?.roomType === "OPEN" &&
        room.active &&
        room.myRole === "OWNER" &&
        !isRoomClosed &&
        !isMembersLoading &&
        !membersLoadErrorCode &&
        candidates.length > 0;

    let action: OpenChatLifecycleAction | null = null;
    if (room?.roomType === "OPEN" && room.active && !isRoomClosed) {
        if (room.myRole === "MEMBER" || room.myRole === "ADMIN") {
            action = "LEAVE";
        } else if (room.myRole === "OWNER" && !isMembersLoading && !membersLoadErrorCode) {
            action = candidates.length > 0 ? "TRANSFER_AND_LEAVE" : "CLOSE";
        }
    }

    const openActionDialog = useCallback(() => {
        if (!action) {
            return;
        }
        onCloseRoomMenu();
        setErrorCode(null);
        setSelectedTargetId(null);
        setHasTransferredOwner(false);
        setDialogMode(action);
    }, [action, onCloseRoomMenu]);

    const openTransferDialog = useCallback(() => {
        if (!canTransferOwner || scopeKey === null || scopeRef.current !== scopeKey) {
            return;
        }

        onCloseRoomMenu();
        setErrorCode(null);
        setSelectedTargetId(null);
        setDialogMode("TRANSFER");
    }, [canTransferOwner, onCloseRoomMenu, scopeKey]);

    const closeDialog = useCallback(() => {
        if (!isSubmitting && dialogMode !== "CLOSED_NOTICE") {
            setDialogMode(null);
            setErrorCode(null);
        }
    }, [dialogMode, isSubmitting]);

    const selectTarget = useCallback((openChatMemberId: number) => {
        setSelectedTargetId(openChatMemberId);
        setErrorCode(null);
    }, []);

    const submit = useCallback(async () => {
        if (!dialogMode || dialogMode === "CLOSED_NOTICE" || submitLockRef.current) {
            return false;
        }
        const needsFreshTransfer =
            dialogMode === "TRANSFER" ||
            (dialogMode === "TRANSFER_AND_LEAVE" && !hasTransferredOwner);
        if (needsFreshTransfer && selectedTargetId == null) {
            setErrorCode("TARGET_REQUIRED");
            return false;
        }
        if (
            needsFreshTransfer &&
            !candidates.some((member) => member.openChatMemberId === selectedTargetId)
        ) {
            setErrorCode("TARGET_UNAVAILABLE");
            return false;
        }
        if (dialogMode === "TRANSFER" && !canTransferOwner) {
            setErrorCode("ACCESS_DENIED");
            return false;
        }
        if (dialogMode === "TRANSFER" && (
            scopeKey === null ||
            loginSessionId === null ||
            scopeRef.current !== scopeKey
        )) {
            setErrorCode("ACCESS_DENIED");
            return false;
        }

        const scopeVersion = scopeVersionRef.current;
        submitLockRef.current = true;
        setIsSubmitting(true);
        setErrorCode(null);

        let ownerTransferCompleted = hasTransferredOwner;
        let ownerTransferAbort: AbortController | null = null;

        try {
            if (dialogMode === "TRANSFER") {
                // 위임 API는 퇴장과 독립적이다. 성공 즉시 방에 머문 채 역할을 반영한다.
                ownerTransferAbort = new AbortController();
                transferAbortRef.current = ownerTransferAbort;
                const detail = await openChatService.transferOwner(roomId, {
                    targetOpenChatMemberId: selectedTargetId as number,
                }, {
                    expectedLoginSessionId: loginSessionId as string,
                    signal: ownerTransferAbort.signal,
                });
                const isCurrentScope = () =>
                    mountedRef.current &&
                    scopeRef.current === scopeKey &&
                    scopeVersionRef.current === scopeVersion;
                if (!isCurrentScope()) {
                    return false;
                }
                setDialogMode(null);
                setSelectedTargetId(null);

                try {
                    await onOwnerTransferred(
                        detail,
                        selectedTargetId as number,
                        isCurrentScope,
                    );
                    if (!isCurrentScope()) {
                        return false;
                    }
                    await invalidateOpenChatRoomListCache();
                } catch {
                    // 위임 자체는 끝났으므로 동기화 실패를 재위임 실패로 표시하지 않는다.
                    console.warn("OPEN room refresh after owner transfer failed.");
                }
                return true;
            }

            if (dialogMode === "TRANSFER_AND_LEAVE") {
                if (!ownerTransferCompleted) {
                    await openChatService.transferOwner(roomId, {
                        targetOpenChatMemberId: selectedTargetId as number,
                    });
                    ownerTransferCompleted = true;
                    setHasTransferredOwner(true);
                }
                await openChatService.leaveRoom(roomId);
            } else if (dialogMode === "CLOSE") {
                await openChatService.closeRoom(roomId);
                setIsRoomClosed(true);
            } else {
                await openChatService.leaveRoom(roomId);
            }

            await invalidateOpenChatRoomListCache();
            router.push("/chat/open");
            return true;
        } catch (error) {
            if (
                !mountedRef.current ||
                scopeRef.current !== scopeKey ||
                scopeVersionRef.current !== scopeVersion
            ) {
                return false;
            }

            console.warn("OPEN room lifecycle action failed:", mapLifecycleError(error));
            setErrorCode(
                dialogMode === "TRANSFER_AND_LEAVE" && ownerTransferCompleted
                    ? "LEAVE_FAILED_AFTER_TRANSFER"
                    : mapLifecycleError(error),
            );

            if (dialogMode === "TRANSFER") {
                // 경합으로 권한이나 후보가 바뀌었으면 서버의 최신 상태를 다시 가져온다.
                try {
                    await onRefreshState();
                } catch {
                    console.warn("OPEN room refresh after transfer error failed.");
                }
            }
            return false;
        } finally {
            if (transferAbortRef.current === ownerTransferAbort) {
                transferAbortRef.current = null;
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
    }, [
        dialogMode,
        hasTransferredOwner,
        canTransferOwner,
        candidates,
        onOwnerTransferred,
        onRefreshState,
        roomId,
        loginSessionId,
        scopeKey,
        router,
        selectedTargetId,
    ]);

    const handleRemoteClosed = useCallback(() => {
        onCloseRoomMenu();
        setIsRoomClosed(true);
        setErrorCode(null);
        setDialogMode("CLOSED_NOTICE");
    }, [onCloseRoomMenu]);

    const acknowledgeClosed = useCallback(() => {
        setDialogMode(null);
        router.push("/chat/open");
    }, [router]);

    return {
        action,
        canTransferOwner,
        dialogMode,
        candidates,
        selectedTargetId,
        isSubmitting,
        errorCode,
        isRoomClosed,
        openActionDialog,
        openTransferDialog,
        closeDialog,
        selectTarget,
        submit,
        handleRemoteClosed,
        acknowledgeClosed,
    };
}
