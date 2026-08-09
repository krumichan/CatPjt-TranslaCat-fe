"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useQuery } from "@/hooks/useQuery";
import { chatAiService } from "@/services/chat/chatAiService";
import type {
    ChatAiMember,
    ChatRoomAiSettingUpdateRequest,
} from "@/types/chat";
import { validateProfileImageFile } from "@/utils/profileImageValidation";

export type ChatAiMemberEditorMode = "create" | "edit";

export interface ChatAiMemberEditorState {
    mode: ChatAiMemberEditorMode;
    member: ChatAiMember | null;
}

export interface ChatAiMemberFormState {
    nickname: string;
    bio: string;
    originalLanguageCode: string;
    personaPrompt: string;
    profileFile: File | null;
    backgroundFile: File | null;
    removeProfileImage: boolean;
    removeBackgroundImage: boolean;
}

const EMPTY_FORM: ChatAiMemberFormState = {
    nickname: "",
    bio: "",
    originalLanguageCode: "ja",
    personaPrompt: "",
    profileFile: null,
    backgroundFile: null,
    removeProfileImage: false,
    removeBackgroundImage: false,
};

interface UseChatAiManagementOptions {
    isOpen: boolean;
    roomId: number;
    canManage: boolean;
}

export function useChatAiManagement({
    isOpen,
    roomId,
    canManage,
}: UseChatAiManagementOptions) {
    const t = useTranslations("ChatAi.management");
    const [editor, setEditor] = useState<ChatAiMemberEditorState | null>(null);
    const [form, setForm] = useState<ChatAiMemberFormState>(EMPTY_FORM);
    const [savingMember, setSavingMember] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const pendingSettingsSavesRef = useRef(0);
    const settingsSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
    const [actionError, setActionError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ChatAiMember | null>(null);

    const membersQuery = useQuery({
        keys: isOpen && canManage ? (["chat-ai-members", roomId] as const) : null,
        fetcher: (_key: string, targetRoomId: number) =>
            chatAiService.getMembers(targetRoomId),
        config: { revalidateOnMount: true },
    });

    const settingsQuery = useQuery({
        keys: isOpen ? (["chat-ai-room-settings", roomId] as const) : null,
        fetcher: (_key: string, targetRoomId: number) =>
            chatAiService.getRoomSettings(targetRoomId),
        config: { revalidateOnMount: true },
    });

    const members = membersQuery.data?.members ?? [];
    const currentCount = membersQuery.data?.currentCount ?? members.length;
    const maxCount =
        membersQuery.data?.maxCount ??
        settingsQuery.data?.maxAiMembersPerRoom ??
        0;
    const canAdd = canManage && currentCount < maxCount;

    useEffect(() => {
        if (isOpen) return;

        setEditor(null);
        setForm(EMPTY_FORM);
        setActionError(null);
        setDeleteTarget(null);
    }, [isOpen]);

    const openCreate = useCallback(() => {
        setEditor({ mode: "create", member: null });
        setForm(EMPTY_FORM);
        setActionError(null);
    }, []);

    const openEdit = useCallback((member: ChatAiMember) => {
        setEditor({ mode: "edit", member });
        setForm({
            nickname: member.nickname,
            bio: member.bio ?? "",
            originalLanguageCode: member.originalLanguageCode,
            personaPrompt: member.personaPrompt,
            profileFile: null,
            backgroundFile: null,
            removeProfileImage: false,
            removeBackgroundImage: false,
        });
        setActionError(null);
    }, []);

    const closeEditor = useCallback(() => {
        if (savingMember) return;

        setEditor(null);
        setForm(EMPTY_FORM);
        setActionError(null);
    }, [savingMember]);

    const updateFormField = useCallback(
        <K extends keyof ChatAiMemberFormState>(
            key: K,
            value: ChatAiMemberFormState[K],
        ) => {
            setForm((current) => ({ ...current, [key]: value }));
        },
        [],
    );

    const reloadAll = useCallback(async () => {
        await Promise.all([
            membersQuery.mutate(undefined, true),
            settingsQuery.mutate(undefined, true),
        ]);
    }, [membersQuery, settingsQuery]);

    const changeFile = useCallback(
        (kind: "profile" | "background", file: File | null) => {
            if (!file) return;

            const validation = validateProfileImageFile(file, kind);
            if (validation) {
                setActionError(
                    validation === "UNSUPPORTED_TYPE"
                        ? t("errors.unsupportedImage")
                        : t("errors.imageTooLarge"),
                );
                return;
            }

            setActionError(null);
            setForm((current) => ({
                ...current,
                ...(kind === "profile"
                    ? {
                          profileFile: file,
                          removeProfileImage: false,
                      }
                    : {
                          backgroundFile: file,
                          removeBackgroundImage: false,
                      }),
            }));
        },
        [t],
    );

    const removeImage = useCallback((kind: "profile" | "background") => {
        setForm((current) =>
            kind === "profile"
                ? {
                      ...current,
                      profileFile: null,
                      removeProfileImage: true,
                  }
                : {
                      ...current,
                      backgroundFile: null,
                      removeBackgroundImage: true,
                  },
        );
    }, []);

    const restoreImage = useCallback((kind: "profile" | "background") => {
        setForm((current) =>
            kind === "profile"
                ? { ...current, removeProfileImage: false }
                : { ...current, removeBackgroundImage: false },
        );
    }, []);

    const validateForm = useCallback((): boolean => {
        const nickname = form.nickname.trim();
        const persona = form.personaPrompt.trim();

        if (!nickname) {
            setActionError(t("errors.nicknameRequired"));
            return false;
        }
        if (nickname.length > 50) {
            setActionError(t("errors.nicknameTooLong"));
            return false;
        }
        if (form.bio.trim().length > 200) {
            setActionError(t("errors.bioTooLong"));
            return false;
        }
        if (!persona) {
            setActionError(t("errors.personaRequired"));
            return false;
        }
        if (persona.length > 4000) {
            setActionError(t("errors.personaTooLong"));
            return false;
        }

        return true;
    }, [form, t]);

    const persistImages = useCallback(
        async (member: ChatAiMember): Promise<void> => {
            let current = member;

            if (form.removeProfileImage && current.profileImageUrl) {
                current = await chatAiService.deleteProfileImage(
                    roomId,
                    current.aiMemberId,
                );
            }
            if (form.profileFile) {
                current = await chatAiService.uploadProfileImage(
                    roomId,
                    current.aiMemberId,
                    form.profileFile,
                );
            }
            if (
                form.removeBackgroundImage &&
                current.profileBackgroundImageUrl
            ) {
                current = await chatAiService.deleteBackgroundImage(
                    roomId,
                    current.aiMemberId,
                );
            }
            if (form.backgroundFile) {
                await chatAiService.uploadBackgroundImage(
                    roomId,
                    current.aiMemberId,
                    form.backgroundFile,
                );
            }
        },
        [form, roomId],
    );

    const saveMember = useCallback(async () => {
        if (!editor || savingMember || !validateForm()) return;

        setSavingMember(true);
        setActionError(null);

        const request = {
            nickname: form.nickname.trim(),
            bio: form.bio.trim() || null,
            originalLanguageCode: form.originalLanguageCode,
            personaPrompt: form.personaPrompt.trim(),
        };
        let persistedMember: ChatAiMember | null = null;

        try {
            persistedMember =
                editor.mode === "create"
                    ? await chatAiService.createMember(roomId, request)
                    : await chatAiService.updateMember(
                          roomId,
                          editor.member!.aiMemberId,
                          request,
                      );

            await persistImages(persistedMember);
            await reloadAll();
            setEditor(null);
            setForm(EMPTY_FORM);
        } catch (error) {
            console.error("Failed to save AI member.", error);

            if (persistedMember) {
                setEditor({ mode: "edit", member: persistedMember });
                try {
                    await reloadAll();
                } catch (reloadError) {
                    console.error(
                        "Failed to reload AI member after a partial save.",
                        reloadError,
                    );
                }
            }

            setActionError(t("errors.saveFailed"));
        } finally {
            setSavingMember(false);
        }
    }, [
        editor,
        form,
        persistImages,
        reloadAll,
        roomId,
        savingMember,
        t,
        validateForm,
    ]);

    const openDeleteDialog = useCallback((member: ChatAiMember) => {
        setDeleteTarget(member);
    }, []);

    const closeDeleteDialog = useCallback(() => {
        setDeleteTarget(null);
    }, []);

    const deleteMember = useCallback(async () => {
        if (!deleteTarget) return;

        try {
            await chatAiService.deleteMember(roomId, deleteTarget.aiMemberId);
            setDeleteTarget(null);
            await reloadAll();
        } catch (error) {
            console.error("Failed to delete AI member.", error);
            setActionError(t("errors.deleteFailed"));
        }
    }, [deleteTarget, reloadAll, roomId, t]);

    const updateSetting = useCallback(
        async (patch: ChatRoomAiSettingUpdateRequest) => {
            if (!canManage) return;

            setActionError(null);

            // Reflect consecutive setting changes in the UI immediately.
            // The actual PATCH requests are serialized below so rapid edits cannot
            // overwrite each other out of order.
            void settingsQuery.mutate(
                (current) =>
                    current
                        ? {
                              ...current,
                              ...patch,
                          }
                        : current,
                false,
            );

            pendingSettingsSavesRef.current += 1;
            setSavingSettings(true);

            const saveTask = settingsSaveQueueRef.current
                .catch(() => undefined)
                .then(async () => {
                    await chatAiService.updateRoomSettings(roomId, patch);
                });

            settingsSaveQueueRef.current = saveTask.catch(() => undefined);

            try {
                await saveTask;
            } catch (error) {
                console.error("Failed to update AI room setting.", error);
                setActionError(t("errors.settingSaveFailed"));
            } finally {
                pendingSettingsSavesRef.current = Math.max(
                    0,
                    pendingSettingsSavesRef.current - 1,
                );

                if (pendingSettingsSavesRef.current === 0) {
                    setSavingSettings(false);
                    await settingsQuery.mutate(undefined, true);
                }
            }
        },
        [canManage, roomId, settingsQuery, t],
    );

    const profilePreview = useMemo(() => {
        if (!editor?.member || form.removeProfileImage) return null;
        return editor.member.profileImageUrl;
    }, [editor, form.removeProfileImage]);

    const backgroundPreview = useMemo(() => {
        if (!editor?.member || form.removeBackgroundImage) return null;
        return editor.member.profileBackgroundImageUrl;
    }, [editor, form.removeBackgroundImage]);

    return {
        members,
        currentCount,
        maxCount,
        canAdd,
        setting: settingsQuery.data,
        isLoading: membersQuery.isLoading || settingsQuery.isLoading,
        isLoadError: Boolean(membersQuery.isError || settingsQuery.isError),

        editor,
        form,
        savingMember,
        savingSettings,
        isBusy: savingMember || savingSettings,
        actionError,
        deleteTarget,
        profilePreview,
        backgroundPreview,

        openCreate,
        openEdit,
        closeEditor,
        updateFormField,
        changeFile,
        removeImage,
        restoreImage,
        saveMember,
        openDeleteDialog,
        closeDeleteDialog,
        deleteMember,
        updateSetting,
        reloadAll,
    };
}

export type ChatAiManagementController = ReturnType<
    typeof useChatAiManagement
>;
