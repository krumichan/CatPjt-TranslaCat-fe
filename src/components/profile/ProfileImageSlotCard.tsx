"use client";

import {
    ImagePlus,
    LoaderCircle,
    RotateCcw,
    Trash2,
    Upload,
    UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChangeEvent } from "react";

import type {
    UseProfileImageSlotResult,
} from "@/hooks/profile/useProfileImageSlot";
import type { ProfileImageKind } from "@/utils/profileImageValidation";
import {
    PROFILE_IMAGE_ACCEPT,
    formatFileSize,
} from "@/utils/profileImageValidation";

interface ProfileImageSlotCardProps {
    kind: ProfileImageKind;
    currentUrl: string | null;
    slot: UseProfileImageSlotResult;
}

export default function ProfileImageSlotCard({
    kind,
    currentUrl,
    slot,
}: ProfileImageSlotCardProps) {
    const t = useTranslations("Social.profilePage.image");
    const imageUrl = slot.previewUrl ?? currentUrl;
    const inputId = `profile-image-${kind}`;
    const isBusy = slot.isUploading || slot.isDeleting;

    const handleFileChange = (
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        slot.selectFile(event.target.files?.[0] ?? null);

        // 같은 파일을 다시 선택할 수 있도록 input 값을 초기화한다.
        event.target.value = "";
    };

    const errorMessage = slot.errorCode
        ? t(`errors.${slot.errorCode}`)
        : null;

    const successMessage = slot.successCode
        ? t(`success.${slot.successCode}`)
        : null;

    return (
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
            <div
                className={
                    kind === "background"
                        ? "relative aspect-[16/6] overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-slate-100 dark:from-orange-500/20 dark:via-slate-900 dark:to-slate-950"
                        : "flex min-h-48 items-center justify-center bg-slate-50 p-6 dark:bg-white/5"
                }
            >
                {imageUrl ? (
                    // Blob preview와 추후 Storage provider 도메인 전환을 고려하여
                    // FE #36에서는 img를 유지한다.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageUrl}
                        alt={t(`${kind}.previewAlt`)}
                        className={
                            kind === "background"
                                ? "h-full w-full object-cover"
                                : "h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg dark:border-slate-900"
                        }
                    />
                ) : kind === "profile" ? (
                    <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-orange-400 to-amber-300 text-white shadow-lg dark:border-slate-900">
                        <UserRound
                            className="h-14 w-14"
                            aria-hidden="true"
                        />
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ImagePlus
                            className="h-12 w-12 text-slate-400"
                            aria-hidden="true"
                        />
                    </div>
                )}

                {slot.previewUrl && (
                    <span className="absolute right-3 top-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                        {t("previewBadge")}
                    </span>
                )}
            </div>

            <div className="p-5">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">
                        {t(`${kind}.eyebrow`)}
                    </p>
                    <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                        {t(`${kind}.title`)}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                        {t(`${kind}.description`)}
                    </p>
                </div>

                <p className="mt-4 text-xs font-medium text-slate-400">
                    {t(`${kind}.rule`)}
                </p>

                {slot.selectedFile && (
                    <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-400/20 dark:bg-orange-500/10">
                        <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-100">
                            {slot.selectedFile.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                            {formatFileSize(slot.selectedFile.size)}
                        </p>
                    </div>
                )}

                {errorMessage && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                        {errorMessage}
                    </div>
                )}

                {successMessage && (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                        {successMessage}
                    </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                    <label
                        htmlFor={inputId}
                        className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 transition hover:border-orange-300 hover:text-orange-500 dark:border-white/10 dark:text-slate-200 dark:hover:border-orange-400/60 dark:hover:text-orange-200 ${
                            isBusy
                                ? "pointer-events-none opacity-50"
                                : ""
                        }`}
                    >
                        <ImagePlus
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                        {currentUrl
                            ? t("actions.replace")
                            : t("actions.choose")}
                    </label>

                    <input
                        id={inputId}
                        type="file"
                        accept={PROFILE_IMAGE_ACCEPT}
                        className="sr-only"
                        disabled={isBusy}
                        onChange={handleFileChange}
                    />

                    {slot.selectedFile && (
                        <>
                            <button
                                type="button"
                                onClick={() => void slot.upload()}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300"
                            >
                                {slot.isUploading ? (
                                    <LoaderCircle
                                        className="h-4 w-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Upload
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                )}
                                {slot.isUploading
                                    ? t("actions.uploading")
                                    : t("actions.upload")}
                            </button>

                            <button
                                type="button"
                                onClick={slot.clearSelection}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-500 transition hover:border-orange-300 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300"
                            >
                                <RotateCcw
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                                {t("actions.cancelPreview")}
                            </button>
                        </>
                    )}

                    {currentUrl && !slot.selectedFile && (
                        <button
                            type="button"
                            onClick={() => void slot.remove()}
                            disabled={isBusy}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-black text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/30 dark:text-rose-200 dark:hover:bg-rose-500/10"
                        >
                            {slot.isDeleting ? (
                                <LoaderCircle
                                    className="h-4 w-4 animate-spin"
                                    aria-hidden="true"
                                />
                            ) : (
                                <Trash2
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                            )}
                            {slot.isDeleting
                                ? t("actions.deleting")
                                : t("actions.delete")}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}
