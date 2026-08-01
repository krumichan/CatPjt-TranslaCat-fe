"use client";

import { useCallback, useRef, useState } from "react";

import { mapOpenChatCreateApiError } from "@/hooks/chat/openChatCreateErrorMapper";
import type {
    OpenChatCreateProcessStage,
    OpenChatCreateSubmitErrorCode,
    UseOpenChatCreateResult,
} from "@/hooks/chat/openChatCreateTypes";
import { useOpenChatCreateRoomForm } from "@/hooks/chat/useOpenChatCreateRoomForm";
import { useRouter } from "@/navigation";
import { openChatService } from "@/services/chat/openChatService";
import type { OpenChatProfileFormValue } from "@/types/chat";
import { invalidateOpenChatRoomListCache } from "@/utils/chat/openChatCache";

export function useOpenChatCreate(): UseOpenChatCreateResult {
    const router = useRouter();
    const submitLockRef = useRef(false);

    const [profileErrorCode, setProfileErrorCode] =
        useState<string | null>(null);
    const [submitErrorCode, setSubmitErrorCode] =
        useState<OpenChatCreateSubmitErrorCode | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [processStage, setProcessStage] =
        useState<OpenChatCreateProcessStage | null>(null);
    const [createdRoomId, setCreatedRoomId] =
        useState<number | null>(null);
    const [createdOwnerNickname, setCreatedOwnerNickname] =
        useState<string | null>(null);

    const clearSubmitError = useCallback(() => {
        setSubmitErrorCode(null);
    }, []);

    const {
        controller: roomForm,
        validate: validateRoomFields,
        applyServerError,
    } = useOpenChatCreateRoomForm({
        isDisabled: isSubmitting,
        isLocked: createdRoomId !== null,
        onInputChanged: clearSubmitError,
    });
    const {
        name,
        description,
        visibility,
        maxMemberCount,
    } = roomForm;

    const applyApiError = useCallback(
        (
            error: unknown,
            stage: OpenChatCreateProcessStage,
            targetRoomId: number | null,
        ) => {
            const mapped = mapOpenChatCreateApiError(error);
            const roomField = mapped.roomField;
            const roomError = mapped.roomError;

            if (roomField && roomError) {
                applyServerError(roomField, roomError);
                return;
            }

            if (mapped.profileError) {
                setProfileErrorCode(mapped.profileError);
                return;
            }

            if (targetRoomId !== null && stage === "UPLOADING") {
                setSubmitErrorCode(
                    "IMAGE_UPLOAD_FAILED_AFTER_CREATE",
                );
                return;
            }

            if (targetRoomId !== null && stage === "SAVING") {
                setSubmitErrorCode(
                    "PROFILE_SYNC_FAILED_AFTER_CREATE",
                );
                return;
            }

            setSubmitErrorCode("CREATE_FAILED");
        },
        [applyServerError],
    );

    const submit = useCallback(
        async (profileValue: OpenChatProfileFormValue) => {
            if (submitLockRef.current || !validateRoomFields()) {
                return false;
            }

            submitLockRef.current = true;
            setIsSubmitting(true);
            setSubmitErrorCode(null);
            setProfileErrorCode(null);

            let targetRoomId = createdRoomId;
            let ownerNickname = createdOwnerNickname;
            let stage: OpenChatCreateProcessStage = "CREATING";

            try {
                if (targetRoomId === null) {
                    setProcessStage(stage);
                    const createdRoom = await openChatService.createRoom({
                        name: name.trim(),
                        description: description.trim(),
                        visibility,
                        maxMemberCount: Number(maxMemberCount),
                        ownerProfile: {
                            nickname: profileValue.nickname,
                            profileImageObjectKey: null,
                        },
                    });

                    targetRoomId = createdRoom.id;
                    ownerNickname =
                        createdRoom.myOpenProfile?.nickname ??
                        profileValue.nickname;
                    setCreatedRoomId(createdRoom.id);
                    setCreatedOwnerNickname(ownerNickname);
                } else if (profileValue.nickname !== ownerNickname) {
                    stage = "SAVING";
                    setProcessStage(stage);
                    const updatedProfile =
                        await openChatService.updateMyProfile(
                            targetRoomId,
                            { nickname: profileValue.nickname },
                        );
                    ownerNickname = updatedProfile.nickname;
                    setCreatedOwnerNickname(ownerNickname);
                }

                if (profileValue.imageFile) {
                    stage = "UPLOADING";
                    setProcessStage(stage);
                    await openChatService.uploadMyProfileImage(
                        targetRoomId,
                        profileValue.imageFile,
                    );
                }

                await invalidateOpenChatRoomListCache();
                router.push(`/chat/rooms/${targetRoomId}`);
                return true;
            } catch (error) {
                console.error("Failed to create OPEN chat room.", error);
                applyApiError(error, stage, targetRoomId);
                return false;
            } finally {
                submitLockRef.current = false;
                setIsSubmitting(false);
                setProcessStage(null);
            }
        },
        [
            applyApiError,
            createdOwnerNickname,
            createdRoomId,
            description,
            maxMemberCount,
            name,
            router,
            validateRoomFields,
            visibility,
        ],
    );

    const cancel = useCallback(() => {
        if (isSubmitting) {
            return;
        }

        router.push(
            createdRoomId === null
                ? "/chat"
                : `/chat/rooms/${createdRoomId}`,
        );
    }, [createdRoomId, isSubmitting, router]);

    return {
        roomForm,
        submission: {
            createdRoomId,
            isSubmitting,
            processStage,
            profileErrorCode,
            submitErrorCode,
            validateRoomFields,
            submit,
            cancel,
        },
    };
}
