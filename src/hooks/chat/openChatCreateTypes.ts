import type { RefObject } from "react";

import type {
    OpenChatProfileFormValue,
    OpenChatVisibility,
} from "@/types/chat";

export type OpenChatCreateRoomField =
    | "name"
    | "description"
    | "visibility"
    | "maxMemberCount";

export type OpenChatCreateRoomValidationError =
    | "NAME_REQUIRED"
    | "NAME_TOO_LONG"
    | "DESCRIPTION_REQUIRED"
    | "DESCRIPTION_TOO_LONG"
    | "VISIBILITY_REQUIRED"
    | "MAX_MEMBER_COUNT_INVALID";

export type OpenChatCreateSubmitErrorCode =
    | "CREATE_FAILED"
    | "IMAGE_UPLOAD_FAILED_AFTER_CREATE"
    | "PROFILE_SYNC_FAILED_AFTER_CREATE";

export type OpenChatCreateProcessStage =
    | "CREATING"
    | "SAVING"
    | "UPLOADING";

export type OpenChatCreateRoomFieldErrors = Partial<
    Record<
        OpenChatCreateRoomField,
        OpenChatCreateRoomValidationError
    >
>;

export interface OpenChatCreateRoomFormController {
    name: string;
    description: string;
    visibility: OpenChatVisibility;
    maxMemberCount: string;
    fieldErrors: OpenChatCreateRoomFieldErrors;
    isLocked: boolean;
    isDisabled: boolean;
    nameInputRef: RefObject<HTMLInputElement | null>;
    descriptionInputRef: RefObject<HTMLTextAreaElement | null>;
    visibilityGroupRef: RefObject<HTMLFieldSetElement | null>;
    maxMemberCountInputRef: RefObject<HTMLInputElement | null>;
    changeName: (value: string) => void;
    changeDescription: (value: string) => void;
    changeVisibility: (value: OpenChatVisibility) => void;
    changeMaxMemberCount: (value: string) => void;
}

export interface OpenChatCreateSubmissionController {
    createdRoomId: number | null;
    isSubmitting: boolean;
    processStage: OpenChatCreateProcessStage | null;
    profileErrorCode: string | null;
    submitErrorCode: OpenChatCreateSubmitErrorCode | null;
    validateRoomFields: () => boolean;
    submit: (value: OpenChatProfileFormValue) => Promise<boolean>;
    cancel: () => void;
}

export interface UseOpenChatCreateResult {
    roomForm: OpenChatCreateRoomFormController;
    submission: OpenChatCreateSubmissionController;
}
