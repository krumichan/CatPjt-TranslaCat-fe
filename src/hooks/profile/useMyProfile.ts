"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { userProfileService } from "@/services/user/userProfileService";
import type {
    UserProfile,
    UserProfileUpdateRequest,
} from "@/types/social";

export interface ProfileFormState {
    nickname: string;
    bio: string;
}

type ProfileLoadErrorCode = "LOAD_FAILED";

type ProfileSaveErrorCode =
    | "VALIDATION_FAILED"
    | "SAVE_FAILED";

interface UseMyProfileResult {
    profile: UserProfile | null;
    form: ProfileFormState;
    isLoading: boolean;
    isSaving: boolean;
    loadErrorCode: ProfileLoadErrorCode | null;
    saveErrorCode: ProfileSaveErrorCode | null;
    validationErrors: Partial<Record<keyof ProfileFormState, string>>;
    hasChanges: boolean;
    isSaved: boolean;
    reload: () => Promise<void>;
    updateField: <K extends keyof ProfileFormState>(
        key: K,
        value: ProfileFormState[K],
    ) => void;
    resetForm: () => void;
    saveProfile: () => Promise<boolean>;
    applyImageProfileUpdate: (profile: UserProfile) => void;
}

const DEFAULT_FORM: ProfileFormState = {
    nickname: "",
    bio: "",
};

function toFormState(profile: UserProfile | null): ProfileFormState {
    if (!profile) {
        return DEFAULT_FORM;
    }

    return {
        nickname: profile.nickname ?? "",
        bio: profile.bio ?? "",
    };
}

function normalizeNullable(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function useMyProfile(): UseMyProfileResult {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [form, setForm] = useState<ProfileFormState>(DEFAULT_FORM);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [loadErrorCode, setLoadErrorCode] =
        useState<ProfileLoadErrorCode | null>(null);
    const [saveErrorCode, setSaveErrorCode] =
        useState<ProfileSaveErrorCode | null>(null);
    const [validationErrors, setValidationErrors] = useState<
        Partial<Record<keyof ProfileFormState, string>>
    >({});
    const [isSaved, setIsSaved] = useState(false);

    const reload = useCallback(async () => {
        setIsLoading(true);
        setLoadErrorCode(null);
        setSaveErrorCode(null);
        setValidationErrors({});
        setIsSaved(false);

        try {
            const loadedProfile =
                await userProfileService.getMyProfile();

            setProfile(loadedProfile);
            setForm(toFormState(loadedProfile));
        } catch (error) {
            console.error("Failed to load my profile.", error);
            setLoadErrorCode("LOAD_FAILED");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    const updateField = useCallback(
        <K extends keyof ProfileFormState>(
            key: K,
            value: ProfileFormState[K],
        ) => {
            setForm((current) => ({
                ...current,
                [key]: value,
            }));

            setValidationErrors((current) => {
                if (!current[key]) {
                    return current;
                }

                const next = { ...current };
                delete next[key];
                return next;
            });

            setSaveErrorCode(null);
            setIsSaved(false);
        },
        [],
    );

    const resetForm = useCallback(() => {
        setForm(toFormState(profile));
        setValidationErrors({});
        setSaveErrorCode(null);
        setIsSaved(false);
    }, [profile]);

    const hasChanges = useMemo(() => {
        const original = toFormState(profile);

        return (
            original.nickname !== form.nickname ||
            original.bio !== form.bio
        );
    }, [form, profile]);

    const validate = useCallback(() => {
        const errors: Partial<
            Record<keyof ProfileFormState, string>
        > = {};

        if (!form.nickname.trim()) {
            errors.nickname = "nicknameRequired";
        }

        if (form.nickname.trim().length > 30) {
            errors.nickname = "nicknameTooLong";
        }

        if (form.bio.length > 200) {
            errors.bio = "bioTooLong";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [form]);

    const saveProfile = useCallback(async () => {
        setSaveErrorCode(null);
        setIsSaved(false);

        if (!validate()) {
            setSaveErrorCode("VALIDATION_FAILED");
            return false;
        }

        const request: UserProfileUpdateRequest = {
            nickname: form.nickname.trim(),
            bio: normalizeNullable(form.bio),
        };

        setIsSaving(true);

        try {
            const updatedProfile =
                await userProfileService.updateMyProfile(request);

            setProfile(updatedProfile);
            setForm(toFormState(updatedProfile));
            setIsSaved(true);

            return true;
        } catch (error) {
            console.error("Failed to save my profile.", error);
            setSaveErrorCode("SAVE_FAILED");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [form, validate]);

    const applyImageProfileUpdate = useCallback(
        (updatedProfile: UserProfile) => {
            // 이미지 업로드/삭제가 텍스트 폼의 미저장 입력값을 덮어쓰지 않도록
            // profile만 갱신하고 form은 유지한다.
            setProfile(updatedProfile);
        },
        [],
    );

    return {
        profile,
        form,
        isLoading,
        isSaving,
        loadErrorCode,
        saveErrorCode,
        validationErrors,
        hasChanges,
        isSaved,
        reload,
        updateField,
        resetForm,
        saveProfile,
        applyImageProfileUpdate,
    };
}
