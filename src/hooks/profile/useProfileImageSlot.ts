"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { userProfileService } from "@/services/user/userProfileService";
import type { UserProfile } from "@/types/social";
import {
    type ProfileImageKind,
    type ProfileImageValidationErrorCode,
    validateProfileImageFile,
} from "@/utils/profileImageValidation";

type ProfileImageActionErrorCode =
    | ProfileImageValidationErrorCode
    | "UPLOAD_FAILED"
    | "DELETE_FAILED";

type ProfileImageSuccessCode = "UPLOADED" | "DELETED";

interface UseProfileImageSlotParams {
    kind: ProfileImageKind;
    onProfileChange: (profile: UserProfile) => void;
}

export interface UseProfileImageSlotResult {
    selectedFile: File | null;
    previewUrl: string | null;
    isUploading: boolean;
    isDeleting: boolean;
    errorCode: ProfileImageActionErrorCode | null;
    successCode: ProfileImageSuccessCode | null;
    selectFile: (file: File | null) => void;
    clearSelection: () => void;
    upload: () => Promise<boolean>;
    remove: () => Promise<boolean>;
}

export function useProfileImageSlot({
    kind,
    onProfileChange,
}: UseProfileImageSlotParams): UseProfileImageSlotResult {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorCode, setErrorCode] =
        useState<ProfileImageActionErrorCode | null>(null);
    const [successCode, setSuccessCode] =
        useState<ProfileImageSuccessCode | null>(null);

    const objectUrlRef = useRef<string | null>(null);

    const revokePreview = useCallback(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }

        setPreviewUrl(null);
    }, []);

    useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    const clearSelection = useCallback(() => {
        revokePreview();
        setSelectedFile(null);
        setErrorCode(null);
        setSuccessCode(null);
    }, [revokePreview]);

    const selectFile = useCallback(
        (file: File | null) => {
            revokePreview();
            setSelectedFile(null);
            setErrorCode(null);
            setSuccessCode(null);

            if (!file) {
                return;
            }

            const validationError =
                validateProfileImageFile(file, kind);

            if (validationError) {
                setErrorCode(validationError);
                return;
            }

            const objectUrl = URL.createObjectURL(file);
            objectUrlRef.current = objectUrl;
            setPreviewUrl(objectUrl);
            setSelectedFile(file);
        },
        [kind, revokePreview],
    );

    const upload = useCallback(async () => {
        if (!selectedFile || isUploading || isDeleting) {
            return false;
        }

        setIsUploading(true);
        setErrorCode(null);
        setSuccessCode(null);

        try {
            const updatedProfile =
                kind === "profile"
                    ? await userProfileService.uploadProfileImage(
                          selectedFile,
                      )
                    : await userProfileService
                          .uploadProfileBackgroundImage(selectedFile);

            onProfileChange(updatedProfile);
            revokePreview();
            setSelectedFile(null);
            setSuccessCode("UPLOADED");

            return true;
        } catch (error) {
            console.error(`Failed to upload ${kind} image.`, error);
            setErrorCode("UPLOAD_FAILED");
            return false;
        } finally {
            setIsUploading(false);
        }
    }, [
        isDeleting,
        isUploading,
        kind,
        onProfileChange,
        revokePreview,
        selectedFile,
    ]);

    const remove = useCallback(async () => {
        if (isUploading || isDeleting) {
            return false;
        }

        setIsDeleting(true);
        setErrorCode(null);
        setSuccessCode(null);

        try {
            const updatedProfile =
                kind === "profile"
                    ? await userProfileService.deleteProfileImage()
                    : await userProfileService
                          .deleteProfileBackgroundImage();

            onProfileChange(updatedProfile);
            clearSelection();
            setSuccessCode("DELETED");

            return true;
        } catch (error) {
            console.error(`Failed to delete ${kind} image.`, error);
            setErrorCode("DELETE_FAILED");
            return false;
        } finally {
            setIsDeleting(false);
        }
    }, [
        clearSelection,
        isDeleting,
        isUploading,
        kind,
        onProfileChange,
    ]);

    return {
        selectedFile,
        previewUrl,
        isUploading,
        isDeleting,
        errorCode,
        successCode,
        selectFile,
        clearSelection,
        upload,
        remove,
    };
}
