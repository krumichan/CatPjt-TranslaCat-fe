"use client";

import { useCallback, useMemo, useState } from "react";

import type { ChatRoomCreateRequest } from "@/types/chat";

type ChatRoomCreateSupportedType = "DIRECT" | "GROUP";

type ChatRoomCreateValidationErrorCode =
    | "MEMBER_REQUIRED"
    | "DIRECT_MEMBER_COUNT_INVALID"
    | "GROUP_MEMBER_REQUIRED"
    | "INVALID_MEMBER_ID";

interface UseChatRoomCreateFormParams {
    onCreate: (request: ChatRoomCreateRequest) => Promise<boolean>;
}

export function useChatRoomCreateForm({
    onCreate,
}: UseChatRoomCreateFormParams) {
    const [roomType, setRoomType] =
        useState<ChatRoomCreateSupportedType>("DIRECT");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [memberUserIdsText, setMemberUserIdsText] = useState("");
    const [validationErrorCode, setValidationErrorCode] =
        useState<ChatRoomCreateValidationErrorCode | null>(null);

    const parsedMemberUserIds = useMemo(() => {
        const values = memberUserIdsText
            .split(/[,\s]+/)
            .map((value) => value.trim())
            .filter(Boolean);

        const ids = values.map((value) => Number(value));

        return {
            ids,
            hasInvalidValue:
                values.length > 0 &&
                ids.some((id) => !Number.isSafeInteger(id) || id <= 0),
        };
    }, [memberUserIdsText]);

    const validate = useCallback(() => {
        if (parsedMemberUserIds.hasInvalidValue) {
            setValidationErrorCode("INVALID_MEMBER_ID");
            return false;
        }

        if (parsedMemberUserIds.ids.length === 0) {
            setValidationErrorCode("MEMBER_REQUIRED");
            return false;
        }

        if (roomType === "DIRECT" && parsedMemberUserIds.ids.length !== 1) {
            setValidationErrorCode("DIRECT_MEMBER_COUNT_INVALID");
            return false;
        }

        if (roomType === "GROUP" && parsedMemberUserIds.ids.length < 1) {
            setValidationErrorCode("GROUP_MEMBER_REQUIRED");
            return false;
        }

        setValidationErrorCode(null);
        return true;
    }, [parsedMemberUserIds, roomType]);

    const handleSubmit = useCallback(async () => {
        if (!validate()) {
            return false;
        }

        const created = await onCreate({
            roomType,
            name: name.trim() || null,
            description: description.trim() || null,
            memberUserIds: parsedMemberUserIds.ids,
        });

        return created;
    }, [description, name, onCreate, parsedMemberUserIds.ids, roomType, validate]);

    return {
        roomType,
        name,
        description,
        memberUserIdsText,
        validationErrorCode,
        setRoomType,
        setName,
        setDescription,
        setMemberUserIdsText,
        setValidationErrorCode,
        handleSubmit,
    };
}