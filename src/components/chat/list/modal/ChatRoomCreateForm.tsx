"use client";

import { useTranslations } from "next-intl";

import { useChatRoomCreateForm } from "@/hooks/chat/useChatRoomCreateForm";
import type { ChatRoomCreateRequest } from "@/types/chat";

interface ChatRoomCreateFormProps {
    isCreating: boolean;
    createErrorMessage: string | null;
    onClose: () => void;
    onCreate: (request: ChatRoomCreateRequest) => Promise<boolean>;
}

export function ChatRoomCreateForm({
    isCreating,
    createErrorMessage,
    onClose,
    onCreate,
}: ChatRoomCreateFormProps) {
    const t = useTranslations("ChatRoomCreate");

    const {
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
    } = useChatRoomCreateForm({
        onCreate,
    });

    const validationErrorMessage = validationErrorCode
        ? t(`validation.${validationErrorCode}`)
        : null;

    return (
        <>
            <div className="space-y-5 p-5">
                <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t("roomType.label")}
                    </p>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setRoomType("DIRECT");
                                setValidationErrorCode(null);
                            }}
                            className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                                roomType === "DIRECT"
                                    ? "border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-300"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            }`}
                        >
                            {t("roomType.direct")}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setRoomType("GROUP");
                                setValidationErrorCode(null);
                            }}
                            className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                                roomType === "GROUP"
                                    ? "border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-300"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            }`}
                        >
                            {t("roomType.group")}
                        </button>
                    </div>
                </div>

                {roomType === "GROUP" && (
                    <label className="block">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {t("name.label")}
                        </span>

                        <input
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder={t("name.placeholder")}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                    </label>
                )}

                <label className="block">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {roomType === "DIRECT"
                            ? t("members.directLabel")
                            : t("members.groupLabel")}
                    </span>

                    <input
                        type="text"
                        value={memberUserIdsText}
                        onChange={(event) => {
                            setMemberUserIdsText(event.target.value);
                            setValidationErrorCode(null);
                        }}
                        placeholder={
                            roomType === "DIRECT"
                                ? t("members.directPlaceholder")
                                : t("members.groupPlaceholder")
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />

                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {roomType === "DIRECT"
                            ? t("members.directHelp")
                            : t("members.groupHelp")}
                    </p>
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t("description.label")}
                    </span>

                    <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder={t("description.placeholder")}
                        rows={3}
                        className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                </label>

                {validationErrorMessage && (
                    <p className="text-sm text-red-500 dark:text-red-300">
                        {validationErrorMessage}
                    </p>
                )}

                {createErrorMessage && (
                    <p className="text-sm text-red-500 dark:text-red-300">
                        {createErrorMessage}
                    </p>
                )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5 dark:border-slate-800">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    {t("cancel")}
                </button>

                <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={isCreating}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isCreating ? t("creating") : t("create")}
                </button>
            </div>
        </>
    );
}