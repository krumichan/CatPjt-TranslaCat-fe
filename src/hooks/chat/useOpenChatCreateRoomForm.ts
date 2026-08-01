"use client";

import { useCallback, useRef, useState } from "react";

import {
    OPEN_CHAT_DEFAULT_MEMBER_COUNT,
    OPEN_CHAT_MAX_MEMBER_COUNT,
    OPEN_CHAT_MIN_MEMBER_COUNT,
    OPEN_CHAT_ROOM_DESCRIPTION_MAX_LENGTH,
    OPEN_CHAT_ROOM_NAME_MAX_LENGTH,
} from "@/constants/openChat";
import type {
    OpenChatCreateRoomField,
    OpenChatCreateRoomFieldErrors,
    OpenChatCreateRoomFormController,
    OpenChatCreateRoomValidationError,
} from "@/hooks/chat/openChatCreateTypes";
import type { OpenChatVisibility } from "@/types/chat";

interface UseOpenChatCreateRoomFormParams {
    isDisabled: boolean;
    isLocked: boolean;
    onInputChanged: () => void;
}

interface UseOpenChatCreateRoomFormResult {
    controller: OpenChatCreateRoomFormController;
    validate: () => boolean;
    applyServerError: (
        field: OpenChatCreateRoomField,
        error: OpenChatCreateRoomValidationError,
    ) => void;
}

export function useOpenChatCreateRoomForm({
    isDisabled,
    isLocked,
    onInputChanged,
}: UseOpenChatCreateRoomFormParams): UseOpenChatCreateRoomFormResult {
    const nameInputRef = useRef<HTMLInputElement>(null);
    const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
    const visibilityGroupRef = useRef<HTMLFieldSetElement>(null);
    const maxMemberCountInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] =
        useState<OpenChatVisibility>("PUBLIC");
    const [maxMemberCount, setMaxMemberCount] = useState(
        String(OPEN_CHAT_DEFAULT_MEMBER_COUNT),
    );
    const [fieldErrors, setFieldErrors] =
        useState<OpenChatCreateRoomFieldErrors>({});

    const focusField = useCallback((field: OpenChatCreateRoomField) => {
        window.requestAnimationFrame(() => {
            switch (field) {
                case "name":
                    nameInputRef.current?.focus();
                    break;
                case "description":
                    descriptionInputRef.current?.focus();
                    break;
                case "visibility":
                    visibilityGroupRef.current
                        ?.querySelector<HTMLInputElement>(
                            'input[type="radio"]',
                        )
                        ?.focus();
                    break;
                case "maxMemberCount":
                    maxMemberCountInputRef.current?.focus();
                    break;
            }
        });
    }, []);

    const clearFieldError = useCallback(
        (field: OpenChatCreateRoomField) => {
            setFieldErrors((current) => {
                if (!current[field]) {
                    return current;
                }

                const next = { ...current };
                delete next[field];
                return next;
            });
            onInputChanged();
        },
        [onInputChanged],
    );

    const changeName = useCallback(
        (value: string) => {
            setName(value);
            clearFieldError("name");
        },
        [clearFieldError],
    );

    const changeDescription = useCallback(
        (value: string) => {
            setDescription(value);
            clearFieldError("description");
        },
        [clearFieldError],
    );

    const changeVisibility = useCallback(
        (value: OpenChatVisibility) => {
            setVisibility(value);
            clearFieldError("visibility");
        },
        [clearFieldError],
    );

    const changeMaxMemberCount = useCallback(
        (value: string) => {
            setMaxMemberCount(value);
            clearFieldError("maxMemberCount");
        },
        [clearFieldError],
    );

    const validate = useCallback(() => {
        const nextErrors: OpenChatCreateRoomFieldErrors = {};
        const normalizedName = name.trim();
        const normalizedDescription = description.trim();
        const normalizedMaxMemberCount = maxMemberCount.trim();
        const parsedMaxMemberCount = Number(normalizedMaxMemberCount);

        if (!normalizedName) {
            nextErrors.name = "NAME_REQUIRED";
        } else if (
            normalizedName.length > OPEN_CHAT_ROOM_NAME_MAX_LENGTH
        ) {
            nextErrors.name = "NAME_TOO_LONG";
        }

        if (!normalizedDescription) {
            nextErrors.description = "DESCRIPTION_REQUIRED";
        } else if (
            normalizedDescription.length >
            OPEN_CHAT_ROOM_DESCRIPTION_MAX_LENGTH
        ) {
            nextErrors.description = "DESCRIPTION_TOO_LONG";
        }

        if (visibility !== "PUBLIC" && visibility !== "UNLISTED") {
            nextErrors.visibility = "VISIBILITY_REQUIRED";
        }

        if (
            !/^\d+$/.test(normalizedMaxMemberCount) ||
            !Number.isInteger(parsedMaxMemberCount) ||
            parsedMaxMemberCount < OPEN_CHAT_MIN_MEMBER_COUNT ||
            parsedMaxMemberCount > OPEN_CHAT_MAX_MEMBER_COUNT
        ) {
            nextErrors.maxMemberCount = "MAX_MEMBER_COUNT_INVALID";
        }

        setFieldErrors(nextErrors);
        onInputChanged();

        const firstInvalidField = (
            [
                "name",
                "description",
                "visibility",
                "maxMemberCount",
            ] as const
        ).find((field) => nextErrors[field]);

        if (firstInvalidField) {
            focusField(firstInvalidField);
            return false;
        }

        return true;
    }, [
        description,
        focusField,
        maxMemberCount,
        name,
        onInputChanged,
        visibility,
    ]);

    const applyServerError = useCallback(
        (
            field: OpenChatCreateRoomField,
            error: OpenChatCreateRoomValidationError,
        ) => {
            setFieldErrors((current) => ({
                ...current,
                [field]: error,
            }));
            focusField(field);
        },
        [focusField],
    );

    return {
        controller: {
            name,
            description,
            visibility,
            maxMemberCount,
            fieldErrors,
            isLocked,
            isDisabled,

            nameInputRef,
            descriptionInputRef,
            visibilityGroupRef,
            maxMemberCountInputRef,

            changeName,
            changeDescription,
            changeVisibility,
            changeMaxMemberCount,
        },
        validate,
        applyServerError,
    };
}
