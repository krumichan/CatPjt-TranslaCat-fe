"use client";

import { PROFILE_IMAGE_ACCEPT } from "@/utils/profileImageValidation";
import { ImagePlus } from "lucide-react";

export function ChatAiImagePicker({
    label,
    currentUrl,
    selectedFile,
    removeSelected,
    disabled,
    inputTestId,
    onFile,
    onRemove,
    onRestore,
    chooseLabel,
    deleteLabel,
    restoreLabel,
}: {
    label: string;
    currentUrl: string | null;
    selectedFile: File | null;
    removeSelected: boolean;
    disabled: boolean;
    inputTestId: string;
    onFile: (file: File | null) => void;
    onRemove: () => void;
    onRestore: () => void;
    chooseLabel: string;
    deleteLabel: string;
    restoreLabel: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900">
            <p className="text-sm font-black text-slate-700 dark:text-slate-100">{label}</p>
            <div className="mt-2 flex min-h-20 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5">
                {selectedFile ? (
                    <span className="max-w-full truncate px-3 text-xs font-bold text-violet-600 dark:text-violet-200">
                        {selectedFile.name}
                    </span>
                ) : currentUrl && !removeSelected ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentUrl} alt="" className="h-20 w-full object-cover" />
                ) : (
                    <ImagePlus className="h-7 w-7 text-slate-300" aria-hidden="true" />
                )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                <label className={`inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 dark:border-white/10 dark:text-slate-200 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
                    <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                    {chooseLabel}
                    <input
                        data-testid={inputTestId}
                        type="file"
                        accept={PROFILE_IMAGE_ACCEPT}
                        disabled={disabled}
                        className="sr-only"
                        onChange={(event) => {
                            onFile(event.target.files?.[0] ?? null);
                            event.target.value = "";
                        }}
                    />
                </label>
                {(currentUrl || selectedFile) && !removeSelected && (
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={disabled}
                        className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-500 dark:border-rose-400/30 dark:text-rose-200"
                    >
                        {deleteLabel}
                    </button>
                )}
                {removeSelected && (
                    <button
                        type="button"
                        onClick={onRestore}
                        disabled={disabled}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-500 dark:border-white/10 dark:text-slate-300"
                    >
                        {restoreLabel}
                    </button>
                )}
            </div>
        </div>
    );
}
