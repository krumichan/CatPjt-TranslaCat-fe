"use client";

import {
    Check,
    Clipboard,
    ImagePlus,
    Loader2,
    RotateCcw,
    Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useState,
} from "react";

import { OpenChatAvatar } from "@/components/chat/open-profile/OpenChatAvatar";
import type {
    OpenChatMemberProfile,
    OpenChatProfileFormMode,
    OpenChatProfileFormValue,
} from "@/types/chat";
import {
    PROFILE_IMAGE_ACCEPT,
    formatFileSize,
    validateProfileImageFile,
} from "@/utils/profileImageValidation";

interface OpenChatProfileFormProps {
    mode: OpenChatProfileFormMode;
    initialProfile?: OpenChatMemberProfile | null;
    initialNickname?: string;
    isSubmitting?: boolean;
    processStage?: "SAVING" | "UPLOADING" | "DELETING" | null;
    disabled?: boolean;
    errorCode?: string | null;
    onSubmit: (
        value: OpenChatProfileFormValue,
    ) => Promise<boolean>;
    onCancel?: () => void;
}

export function OpenChatProfileForm({
    mode,
    initialProfile = null,
    initialNickname = "",
    isSubmitting = false,
    processStage = null,
    disabled = false,
    errorCode = null,
    onSubmit,
    onCancel,
}: OpenChatProfileFormProps) {
    const t = useTranslations("ChatRoom.openProfile");
    const inputId = useId();
    const nicknameInputId = useId();
    const [nickname, setNickname] = useState(
        initialProfile?.nickname ?? initialNickname,
    );
    const [selectedFile, setSelectedFile] =
        useState<File | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [validationError, setValidationError] = useState<
        | "NICKNAME_REQUIRED"
        | "NICKNAME_TOO_LONG"
        | "UNSUPPORTED_TYPE"
        | "FILE_TOO_LARGE"
        | null
    >(null);
    const [copied, setCopied] = useState(false);

    const previewUrl = useMemo(
        () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
        [selectedFile],
    );

    useEffect(
        () => () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        },
        [previewUrl],
    );

    const currentImageUrl = removeImage
        ? null
        : previewUrl ?? initialProfile?.profileImageUrl ?? null;
    const isBusy = isSubmitting || disabled;

    const handleFileChange = useCallback(
        (file: File | null) => {
            if (!file) {
                return;
            }

            const nextError = validateProfileImageFile(file, "profile");
            if (nextError) {
                setValidationError(nextError);
                return;
            }

            setSelectedFile(file);
            setRemoveImage(false);
            setValidationError(null);
        },
        [],
    );

    const handleSubmit = useCallback(async () => {
        const normalizedNickname = nickname.trim();

        if (!normalizedNickname) {
            setValidationError("NICKNAME_REQUIRED");
            return;
        }

        if (normalizedNickname.length > 50) {
            setValidationError("NICKNAME_TOO_LONG");
            return;
        }

        setValidationError(null);
        await onSubmit({
            nickname: normalizedNickname,
            imageFile: selectedFile,
            removeImage,
        });
    }, [nickname, onSubmit, removeImage, selectedFile]);

    const memberCode = initialProfile?.memberCode ?? null;

    const copyMemberCode = useCallback(async () => {
        if (!memberCode) {
            return;
        }

        try {
            await navigator.clipboard.writeText(memberCode);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch (error) {
            console.error("Failed to copy OPEN member code.", error);
            setCopied(false);
        }
    }, [memberCode]);

    const submitText = processStage
        ? t(`form.processing.${processStage}`)
        : t(`form.submit.${mode}`);

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-400/20 dark:bg-orange-500/10">
                <p className="text-sm font-black text-orange-700 dark:text-orange-200">
                    {t(`form.mode.${mode}.title`)}
                </p>
                <p className="mt-1 text-xs leading-5 text-orange-600/90 dark:text-orange-100/80">
                    {t(`form.mode.${mode}.description`)}
                </p>
            </div>

            <div className="flex flex-col items-center">
                <OpenChatAvatar
                    profileImageUrl={currentImageUrl}
                    alt={t("form.image.alt", {
                        nickname: nickname.trim() || t("defaultNickname"),
                    })}
                    size="lg"
                    testId="open-chat-profile-avatar-preview"
                />

                <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {currentImageUrl
                        ? t("form.image.custom")
                        : t("form.image.defaultAvatar")}
                </p>

                {selectedFile && (
                    <p className="mt-2 max-w-full truncate text-xs font-bold text-slate-500 dark:text-slate-300">
                        {selectedFile.name} ·{" "}
                        {formatFileSize(selectedFile.size)}
                    </p>
                )}

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <label
                        htmlFor={inputId}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 transition hover:border-orange-300 hover:text-orange-500 dark:border-white/10 dark:text-slate-200 ${
                            isBusy ? "pointer-events-none opacity-50" : ""
                        }`}
                    >
                        <ImagePlus className="h-4 w-4" aria-hidden="true" />
                        {currentImageUrl
                            ? t("form.image.replace")
                            : t("form.image.choose")}
                    </label>
                    <input
                        id={inputId}
                        type="file"
                        accept={PROFILE_IMAGE_ACCEPT}
                        className="sr-only"
                        disabled={isBusy}
                        aria-label={t("form.image.inputLabel")}
                        onChange={(event) => {
                            handleFileChange(event.target.files?.[0] ?? null);
                            event.currentTarget.value = "";
                        }}
                    />

                    {selectedFile && (
                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                                setSelectedFile(null);
                                setValidationError(null);
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-500 transition hover:border-orange-300 hover:text-orange-500 disabled:opacity-50 dark:border-white/10 dark:text-slate-300"
                        >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            {t("form.image.cancelPreview")}
                        </button>
                    )}

                    {initialProfile?.profileImageUrl &&
                        !selectedFile &&
                        !removeImage && (
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                    setRemoveImage(true);
                                    setValidationError(null);
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-black text-rose-500 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-400/30 dark:text-rose-200 dark:hover:bg-rose-500/10"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                {t("form.image.delete")}
                            </button>
                        )}

                    {removeImage && (
                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setRemoveImage(false)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-500 transition hover:border-orange-300 hover:text-orange-500 disabled:opacity-50 dark:border-white/10 dark:text-slate-300"
                        >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            {t("form.image.restore")}
                        </button>
                    )}
                </div>

                <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                    {t("form.image.rules")}
                </p>
            </div>

            <div>
                <label
                    htmlFor={nicknameInputId}
                    className="text-sm font-black text-slate-800 dark:text-slate-100"
                >
                    {t("form.nickname.label")}
                </label>
                <input
                    id={nicknameInputId}
                    value={nickname}
                    maxLength={50}
                    disabled={isBusy}
                    autoComplete="off"
                    onChange={(event) => {
                        setNickname(event.target.value);
                        setValidationError(null);
                    }}
                    placeholder={t("form.nickname.placeholder")}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:ring-orange-500/10"
                />
                <div className="mt-2 flex items-start justify-between gap-3 text-xs">
                    <p className="text-slate-400">
                        {t("form.nickname.duplicateAllowed")}
                    </p>
                    <span className="shrink-0 font-bold text-slate-400">
                        {nickname.length}/50
                    </span>
                </div>
            </div>

            {initialProfile?.memberCode && (
                <div>
                    <label className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {t("form.memberCode.label")}
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                        <input
                            value={initialProfile.memberCode}
                            readOnly
                            aria-readonly="true"
                            aria-label={t("form.memberCode.readOnlyLabel", {
                                code: initialProfile.memberCode,
                            })}
                            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 font-mono text-sm font-black tracking-wider text-slate-700 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                        />
                        <button
                            type="button"
                            onClick={() => void copyMemberCode()}
                            aria-label={t("form.memberCode.copy")}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-orange-300 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-white/10 dark:text-slate-300"
                        >
                            {copied ? (
                                <Check className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <Clipboard className="h-4 w-4" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                        {t("form.memberCode.help")}
                    </p>
                    <span className="sr-only" role="status" aria-live="polite">
                        {copied ? t("form.memberCode.copied") : ""}
                    </span>
                </div>
            )}

            {(validationError || errorCode) && (
                <p
                    role="alert"
                    aria-live="assertive"
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                >
                    {validationError
                        ? t(`errors.${validationError}`)
                        : t(`errors.${errorCode}`)}
                </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {onCancel && (
                    <button
                        type="button"
                        disabled={isBusy}
                        onClick={onCancel}
                        className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                    >
                        {t("form.cancel")}
                    </button>
                )}
                <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleSubmit()}
                    data-testid="open-chat-profile-submit"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300"
                >
                    {isSubmitting && (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    )}
                    {submitText}
                </button>
            </div>
        </div>
    );
}
