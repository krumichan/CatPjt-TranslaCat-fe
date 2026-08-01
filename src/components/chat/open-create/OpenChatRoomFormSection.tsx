"use client";

import { Globe2, Link2, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import {
    OPEN_CHAT_DEFAULT_MEMBER_COUNT,
    OPEN_CHAT_MAX_MEMBER_COUNT,
    OPEN_CHAT_MIN_MEMBER_COUNT,
    OPEN_CHAT_ROOM_DESCRIPTION_MAX_LENGTH,
    OPEN_CHAT_ROOM_NAME_MAX_LENGTH,
} from "@/constants/openChat";
import type { OpenChatCreateRoomFormController } from "@/hooks/chat/openChatCreateTypes";

interface OpenChatRoomFormSectionProps {
    controller: OpenChatCreateRoomFormController;
}

export function OpenChatRoomFormSection({
    controller,
}: OpenChatRoomFormSectionProps) {
    const t = useTranslations("OpenChatCreate");
    const {
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
    } = controller;
    const fieldsDisabled = isDisabled || isLocked;

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                    <Globe2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">
                        {t("room.eyebrow")}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                        {t("room.title")}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">
                        {t("room.description")}
                    </p>
                </div>
            </div>

            <div className="mt-7 space-y-6">
                <div>
                    <label
                        htmlFor="open-chat-room-name"
                        className="text-sm font-black text-slate-800 dark:text-slate-100"
                    >
                        {t("fields.name.label")}
                    </label>
                    <input
                        ref={nameInputRef}
                        id="open-chat-room-name"
                        value={name}
                        maxLength={OPEN_CHAT_ROOM_NAME_MAX_LENGTH}
                        disabled={fieldsDisabled}
                        aria-invalid={Boolean(fieldErrors.name)}
                        aria-describedby={
                            fieldErrors.name
                                ? "open-chat-room-name-help open-chat-room-name-error"
                                : "open-chat-room-name-help"
                        }
                        autoComplete="off"
                        onChange={(event) => changeName(event.target.value)}
                        placeholder={t("fields.name.placeholder")}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:ring-orange-500/10 dark:disabled:bg-white/5"
                    />
                    <div
                        id="open-chat-room-name-help"
                        className="mt-2 flex justify-between gap-3 text-xs text-slate-400"
                    >
                        <span>{t("fields.name.help")}</span>
                        <span className="shrink-0 font-bold">
                            {name.length}/{OPEN_CHAT_ROOM_NAME_MAX_LENGTH}
                        </span>
                    </div>
                    {fieldErrors.name && (
                        <p
                            id="open-chat-room-name-error"
                            role="alert"
                            className="mt-2 text-sm font-bold text-rose-600 dark:text-rose-300"
                        >
                            {t(`errors.${fieldErrors.name}`)}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="open-chat-room-description"
                        className="text-sm font-black text-slate-800 dark:text-slate-100"
                    >
                        {t("fields.description.label")}
                    </label>
                    <textarea
                        ref={descriptionInputRef}
                        id="open-chat-room-description"
                        value={description}
                        maxLength={OPEN_CHAT_ROOM_DESCRIPTION_MAX_LENGTH}
                        disabled={fieldsDisabled}
                        aria-invalid={Boolean(fieldErrors.description)}
                        aria-describedby={
                            fieldErrors.description
                                ? "open-chat-room-description-help open-chat-room-description-error"
                                : "open-chat-room-description-help"
                        }
                        rows={5}
                        onChange={(event) =>
                            changeDescription(event.target.value)
                        }
                        placeholder={t("fields.description.placeholder")}
                        className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold leading-6 text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:ring-orange-500/10 dark:disabled:bg-white/5"
                    />
                    <div
                        id="open-chat-room-description-help"
                        className="mt-2 flex justify-between gap-3 text-xs text-slate-400"
                    >
                        <span>{t("fields.description.help")}</span>
                        <span className="shrink-0 font-bold">
                            {description.length}/
                            {OPEN_CHAT_ROOM_DESCRIPTION_MAX_LENGTH}
                        </span>
                    </div>
                    {fieldErrors.description && (
                        <p
                            id="open-chat-room-description-error"
                            role="alert"
                            className="mt-2 text-sm font-bold text-rose-600 dark:text-rose-300"
                        >
                            {t(`errors.${fieldErrors.description}`)}
                        </p>
                    )}
                </div>

                <fieldset
                    ref={visibilityGroupRef}
                    disabled={fieldsDisabled}
                    aria-describedby={
                        fieldErrors.visibility
                            ? "open-chat-visibility-help open-chat-visibility-error"
                            : "open-chat-visibility-help"
                    }
                    className="min-w-0"
                >
                    <legend className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {t("fields.visibility.label")}
                    </legend>
                    <p
                        id="open-chat-visibility-help"
                        className="mt-1 text-xs leading-5 text-slate-400"
                    >
                        {t("fields.visibility.help")}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {(["PUBLIC", "UNLISTED"] as const).map((value) => {
                            const selected = visibility === value;
                            const Icon = value === "PUBLIC" ? Globe2 : Link2;

                            return (
                                <label
                                    key={value}
                                    className={`relative flex cursor-pointer items-start gap-3 rounded-3xl border p-4 transition focus-within:ring-2 focus-within:ring-orange-500 ${
                                        selected
                                            ? "border-orange-400 bg-orange-50 dark:border-orange-400 dark:bg-orange-500/10"
                                            : "border-slate-200 hover:border-orange-200 dark:border-white/10 dark:hover:border-orange-400/30"
                                    } ${
                                        isLocked
                                            ? "cursor-not-allowed opacity-70"
                                            : ""
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="open-chat-visibility"
                                        value={value}
                                        checked={selected}
                                        onChange={() => changeVisibility(value)}
                                        className="sr-only"
                                    />
                                    <span
                                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                                            selected
                                                ? "bg-orange-500 text-white dark:bg-orange-400 dark:text-slate-950"
                                                : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300"
                                        }`}
                                    >
                                        <Icon
                                            className="h-4 w-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-black text-slate-900 dark:text-white">
                                            {t(
                                                `fields.visibility.options.${value}.label`,
                                            )}
                                        </span>
                                        <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-300">
                                            {t(
                                                `fields.visibility.options.${value}.description`,
                                            )}
                                        </span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                    {fieldErrors.visibility && (
                        <p
                            id="open-chat-visibility-error"
                            role="alert"
                            className="mt-2 text-sm font-bold text-rose-600 dark:text-rose-300"
                        >
                            {t(`errors.${fieldErrors.visibility}`)}
                        </p>
                    )}
                </fieldset>

                <div>
                    <label
                        htmlFor="open-chat-max-members"
                        className="text-sm font-black text-slate-800 dark:text-slate-100"
                    >
                        {t("fields.maxMemberCount.label")}
                    </label>
                    <div className="mt-2 flex items-center gap-3">
                        <div className="relative min-w-0 flex-1">
                            <Users
                                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                aria-hidden="true"
                            />
                            <input
                                ref={maxMemberCountInputRef}
                                id="open-chat-max-members"
                                type="number"
                                inputMode="numeric"
                                min={OPEN_CHAT_MIN_MEMBER_COUNT}
                                max={OPEN_CHAT_MAX_MEMBER_COUNT}
                                step={1}
                                value={maxMemberCount}
                                disabled={fieldsDisabled}
                                aria-invalid={Boolean(
                                    fieldErrors.maxMemberCount,
                                )}
                                aria-describedby={
                                    fieldErrors.maxMemberCount
                                        ? "open-chat-max-members-help open-chat-max-members-error"
                                        : "open-chat-max-members-help"
                                }
                                onChange={(event) =>
                                    changeMaxMemberCount(event.target.value)
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-black text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:ring-orange-500/10 dark:disabled:bg-white/5"
                            />
                        </div>
                        <span className="shrink-0 text-sm font-black text-slate-500 dark:text-slate-300">
                            {t("fields.maxMemberCount.unit")}
                        </span>
                    </div>
                    <p
                        id="open-chat-max-members-help"
                        className="mt-2 text-xs leading-5 text-slate-400"
                    >
                        {t("fields.maxMemberCount.help", {
                            min: OPEN_CHAT_MIN_MEMBER_COUNT,
                            default: OPEN_CHAT_DEFAULT_MEMBER_COUNT,
                            max: OPEN_CHAT_MAX_MEMBER_COUNT,
                        })}
                    </p>
                    {fieldErrors.maxMemberCount && (
                        <p
                            id="open-chat-max-members-error"
                            role="alert"
                            className="mt-2 text-sm font-bold text-rose-600 dark:text-rose-300"
                        >
                            {t(`errors.${fieldErrors.maxMemberCount}`, {
                                min: OPEN_CHAT_MIN_MEMBER_COUNT,
                                max: OPEN_CHAT_MAX_MEMBER_COUNT,
                            })}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
