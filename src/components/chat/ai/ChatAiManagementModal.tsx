"use client";

import {
    Bot,
    Edit3,
    EyeOff,
    ImagePlus,
    Loader2,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    UserRound,
    X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import type { RefObject } from "react";

import { ChatAiPolicyNotice } from "@/components/chat/ai/ChatAiPolicyNotice";
import ConfirmModal from "@/components/common/ConfirmModal";
import FeedbackMessage from "@/components/common/FeedbackMessage";
import { CHAT_LANGUAGE_OPTIONS } from "@/constants/chatLanguages";
import type { ChatAiManagementController } from "@/hooks/chat/useChatAiManagement";
import type {
    ChatAiDisclosureType,
    ChatAiMember,
    ChatAiMentionPermission,
    ChatRoomType,
} from "@/types/chat";
import { PROFILE_IMAGE_ACCEPT } from "@/utils/profileImageValidation";

interface ChatAiManagementModalProps {
    isOpen: boolean;
    roomType: ChatRoomType;
    canManage: boolean;
    modalRef: RefObject<HTMLElement | null>;
    controller: ChatAiManagementController;
    onClose: () => void;
}

export function ChatAiManagementModal({
    isOpen,
    roomType,
    canManage,
    modalRef,
    controller,
    onClose,
}: ChatAiManagementModalProps) {
    const t = useTranslations("ChatAi.management");
    const {
        members,
        currentCount,
        maxCount,
        canAdd,
        setting,
        isLoading,
        isLoadError,
        editor,
        form,
        savingMember,
        savingSettings,
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
    } = controller;

    if (!isOpen || typeof document === "undefined") return null;


    return createPortal(
        <>
            <div
                data-testid="chat-ai-management-overlay"
                className="fixed inset-0 z-1200 flex items-center justify-center bg-slate-950/65 px-3 py-5 backdrop-blur-sm sm:px-5"
                onMouseDown={() => {
                    if (!savingMember && !savingSettings) onClose();
                }}
            >
                <section
                    ref={modalRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="chat-ai-management-title"
                    data-testid="chat-ai-management-modal"
                    className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950"
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10 sm:px-6">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
                                {t("eyebrow")}
                            </p>
                            <h2
                                id="chat-ai-management-title"
                                className="mt-1 text-xl font-black text-slate-950 dark:text-white sm:text-2xl"
                            >
                                {canManage ? t("title.manage") : t("title.view")}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                                {t("description", { roomType })}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={savingMember || savingSettings}
                            aria-label={t("close")}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </header>

                    <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                        {isLoading ? (
                            <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-bold text-slate-500">
                                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                                {t("loading")}
                            </div>
                        ) : isLoadError || !setting ? (
                            <div className="flex min-h-64 flex-col items-center justify-center text-center">
                                <p className="font-black text-rose-500">{t("errors.loadFailed")}</p>
                                <button
                                    type="button"
                                    onClick={() => void reloadAll()}
                                    className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 dark:border-white/10 dark:text-slate-200"
                                >
                                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                    {t("retry")}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {actionError && (
                                    <FeedbackMessage variant="error">{actionError}</FeedbackMessage>
                                )}

                                <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5 sm:p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-950 dark:text-white">
                                                {t("policy.title")}
                                            </h3>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                                                {canManage ? t("policy.manageHelp") : t("policy.readOnlyHelp")}
                                            </p>
                                        </div>
                                        {savingSettings && (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-500">
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                                {t("policy.saving")}
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-4">
                                        <ChatAiPolicyNotice
                                            disclosureType={setting.disclosureType}
                                            aiEnabled={setting.aiEnabled}
                                        />
                                    </div>

                                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            {t("policy.disclosure")}
                                            <select
                                                data-testid="chat-ai-disclosure-select"
                                                value={setting.disclosureType}
                                                disabled={!canManage}
                                                onChange={(event) =>
                                                    void updateSetting({
                                                        disclosureType: event.target.value as ChatAiDisclosureType,
                                                    })
                                                }
                                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900"
                                            >
                                                <option value="PUBLIC">{t("policy.disclosureOptions.PUBLIC")}</option>
                                                <option value="PRIVATE">{t("policy.disclosureOptions.PRIVATE")}</option>
                                            </select>
                                        </label>

                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            {t("policy.mentionPermission")}
                                            <select
                                                data-testid="chat-ai-mention-permission-select"
                                                value={setting.mentionPermission}
                                                disabled={!canManage}
                                                onChange={(event) =>
                                                    void updateSetting({
                                                        mentionPermission: event.target.value as ChatAiMentionPermission,
                                                    })
                                                }
                                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900"
                                            >
                                                <option value="ALL_MEMBERS">{t("policy.mentionOptions.ALL_MEMBERS")}</option>
                                                <option value="OWNER_ADMIN_ONLY">{t("policy.mentionOptions.OWNER_ADMIN_ONLY")}</option>
                                            </select>
                                        </label>
                                    </div>

                                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                                        <SettingToggle
                                            label={t("policy.conversation.title")}
                                            description={t("policy.conversation.description")}
                                            checked={setting.conversationEnabled}
                                            disabled={!canManage}
                                            testId="chat-ai-conversation-toggle"
                                            onChange={(checked) => void updateSetting({ conversationEnabled: checked })}
                                        />
                                        <SettingToggle
                                            label={t("policy.revival.title")}
                                            description={t("policy.revival.description")}
                                            checked={setting.revivalEnabled}
                                            disabled={!canManage}
                                            testId="chat-ai-revival-toggle"
                                            onChange={(checked) => void updateSetting({ revivalEnabled: checked })}
                                        />
                                    </div>
                                </section>

                                <section>
                                    <div className="flex flex-wrap items-end justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-950 dark:text-white">
                                                {t("members.title")}
                                            </h3>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                                                {t("members.count", { current: currentCount, max: maxCount })}
                                            </p>
                                        </div>
                                        {canManage && (
                                            <button
                                                type="button"
                                                data-testid="chat-ai-add-member"
                                                onClick={openCreate}
                                                disabled={!canAdd || savingMember}
                                                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                                            >
                                                <Plus className="h-4 w-4" aria-hidden="true" />
                                                {canAdd ? t("members.add") : t("members.maxReached")}
                                            </button>
                                        )}
                                    </div>

                                    {editor && canManage && (
                                        <div
                                            data-testid="chat-ai-member-editor"
                                            className="mt-4 rounded-3xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-400/20 dark:bg-violet-500/5 sm:p-5"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h4 className="font-black text-slate-900 dark:text-white">
                                                        {t(`editor.${editor.mode}.title`)}
                                                    </h4>
                                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                                                        {t(`editor.${editor.mode}.description`)}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={closeEditor}
                                                    disabled={savingMember}
                                                    aria-label={t("editor.close")}
                                                    className="rounded-xl p-2 text-slate-400 hover:bg-white dark:hover:bg-white/10"
                                                >
                                                    <X className="h-4 w-4" aria-hidden="true" />
                                                </button>
                                            </div>

                                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                <TextField
                                                    label={t("editor.nickname")}
                                                    value={form.nickname}
                                                    maxLength={50}
                                                    testId="chat-ai-nickname-input"
                                                    onChange={(value) => updateFormField("nickname", value)}
                                                />
                                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                    {t("editor.language")}
                                                    <select
                                                        data-testid="chat-ai-language-select"
                                                        value={form.originalLanguageCode}
                                                        onChange={(event) => updateFormField("originalLanguageCode", event.target.value)}
                                                        disabled={savingMember}
                                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-900"
                                                    >
                                                        {CHAT_LANGUAGE_OPTIONS.map((option) => (
                                                            <option key={option.code} value={option.code}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </div>

                                            <label className="mt-4 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                                {t("editor.bio")}
                                                <textarea
                                                    data-testid="chat-ai-bio-input"
                                                    value={form.bio}
                                                    maxLength={200}
                                                    disabled={savingMember}
                                                    onChange={(event) => updateFormField("bio", event.target.value)}
                                                    className="mt-2 min-h-20 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-900"
                                                />
                                            </label>

                                            <label className="mt-4 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                                {t("editor.persona")}
                                                <textarea
                                                    data-testid="chat-ai-persona-input"
                                                    value={form.personaPrompt}
                                                    maxLength={4000}
                                                    disabled={savingMember}
                                                    onChange={(event) => updateFormField("personaPrompt", event.target.value)}
                                                    className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-900"
                                                />
                                                <span className="mt-1 block text-right text-xs text-slate-400">
                                                    {form.personaPrompt.length} / 4000
                                                </span>
                                            </label>

                                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                <ImagePicker
                                                    label={t("editor.profileImage")}
                                                    currentUrl={profilePreview}
                                                    selectedFile={form.profileFile}
                                                    removeSelected={form.removeProfileImage}
                                                    disabled={savingMember}
                                                    inputTestId="chat-ai-profile-image-input"
                                                    onFile={(file) => changeFile("profile", file)}
                                                    onRemove={() => removeImage("profile")}
                                                    onRestore={() => restoreImage("profile")}
                                                    chooseLabel={t("editor.image.choose")}
                                                    deleteLabel={t("editor.image.delete")}
                                                    restoreLabel={t("editor.image.restore")}
                                                />
                                                <ImagePicker
                                                    label={t("editor.backgroundImage")}
                                                    currentUrl={backgroundPreview}
                                                    selectedFile={form.backgroundFile}
                                                    removeSelected={form.removeBackgroundImage}
                                                    disabled={savingMember}
                                                    inputTestId="chat-ai-background-image-input"
                                                    onFile={(file) => changeFile("background", file)}
                                                    onRemove={() => removeImage("background")}
                                                    onRestore={() => restoreImage("background")}
                                                    chooseLabel={t("editor.image.choose")}
                                                    deleteLabel={t("editor.image.delete")}
                                                    restoreLabel={t("editor.image.restore")}
                                                />
                                            </div>

                                            <div className="mt-5 flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={closeEditor}
                                                    disabled={savingMember}
                                                    className="rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200"
                                                >
                                                    {t("editor.cancel")}
                                                </button>
                                                <button
                                                    type="button"
                                                    data-testid="chat-ai-save-member"
                                                    onClick={() => void saveMember()}
                                                    disabled={savingMember}
                                                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-60"
                                                >
                                                    {savingMember ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                                    ) : (
                                                        <Save className="h-4 w-4" aria-hidden="true" />
                                                    )}
                                                    {savingMember ? t("editor.saving") : t("editor.save")}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {!canManage &&
                                    setting.disclosureType === "PRIVATE" &&
                                    members.length > 0 ? (
                                        <div
                                            data-testid="chat-ai-private-members-hidden"
                                            className="mt-4 rounded-3xl border border-violet-200 bg-violet-50/60 px-5 py-8 text-center dark:border-violet-400/20 dark:bg-violet-500/5"
                                        >
                                            <EyeOff className="mx-auto h-8 w-8 text-violet-400" aria-hidden="true" />
                                            <p className="mt-3 font-black text-slate-800 dark:text-slate-100">
                                                {t("members.privateHiddenTitle")}
                                            </p>
                                            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-300">
                                                {t("members.privateHiddenDescription")}
                                            </p>
                                        </div>
                                    ) : members.length === 0 ? (
                                        <div className="mt-4 rounded-3xl border border-dashed border-slate-300 px-5 py-10 text-center dark:border-white/15">
                                            <Bot className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" />
                                            <p className="mt-3 font-black text-slate-700 dark:text-slate-200">
                                                {t("members.empty")}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-400">{t("members.emptyDescription")}</p>
                                        </div>
                                    ) : (
                                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                                            {members.map((member) => (
                                                <article
                                                    key={member.aiMemberId}
                                                    data-testid={`chat-ai-member-${member.aiMemberId}`}
                                                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900"
                                                >
                                                    <div
                                                        className="h-20 bg-linear-to-r from-violet-100 via-sky-50 to-orange-50 bg-cover bg-center dark:from-violet-500/20 dark:via-slate-900 dark:to-orange-500/10"
                                                        style={
                                                            member.profileBackgroundImageUrl
                                                                ? { backgroundImage: `url(${member.profileBackgroundImageUrl})` }
                                                                : undefined
                                                        }
                                                    />
                                                    <div className="p-4">
                                                        <div className="flex items-start gap-3">
                                                            <AiAvatar member={member} />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <h4 className="truncate font-black text-slate-900 dark:text-white">
                                                                        {member.nickname}
                                                                    </h4>
                                                                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-black text-violet-600 dark:bg-violet-500/10 dark:text-violet-200">
                                                                        AI
                                                                    </span>
                                                                </div>
                                                                <p className="mt-1 text-xs font-bold uppercase text-slate-400">
                                                                    {member.originalLanguageCode}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500 dark:text-slate-300">
                                                            {member.bio || t("members.noBio")}
                                                        </p>
                                                        {canManage && (
                                                            <div className="mt-4 flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    data-testid={`chat-ai-edit-member-${member.aiMemberId}`}
                                                                    onClick={() => openEdit(member)}
                                                                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:border-violet-300 hover:text-violet-600 dark:border-white/10 dark:text-slate-200"
                                                                >
                                                                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    {t("members.edit")}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    data-testid={`chat-ai-delete-member-${member.aiMemberId}`}
                                                                    onClick={() => openDeleteDialog(member)}
                                                                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-500 hover:bg-rose-50 dark:border-rose-400/30 dark:text-rose-200 dark:hover:bg-rose-500/10"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    {t("members.delete")}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <ConfirmModal
                isOpen={deleteTarget !== null}
                title={t("delete.title")}
                description={
                    deleteTarget
                        ? t("delete.description", { nickname: deleteTarget.nickname })
                        : undefined
                }
                confirmLabel={t("delete.confirm")}
                variant="danger"
                layer="nested"
                onClose={closeDeleteDialog}
                onConfirm={deleteMember}
            />
        </>,
        document.body,
    );
}

function SettingToggle({
    label,
    description,
    checked,
    disabled,
    testId,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    disabled: boolean;
    testId: string;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <span>
                <span className="block text-sm font-black text-slate-800 dark:text-slate-100">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span>
            </span>
            <input
                data-testid={testId}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
                className="mt-1 h-5 w-5 accent-violet-600"
            />
        </label>
    );
}

function TextField({
    label,
    value,
    maxLength,
    testId,
    onChange,
}: {
    label: string;
    value: string;
    maxLength: number;
    testId: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {label}
            <input
                data-testid={testId}
                value={value}
                maxLength={maxLength}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-900"
            />
        </label>
    );
}

function ImagePicker({
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

function AiAvatar({ member }: { member: ChatAiMember }) {
    return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 text-violet-500 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200">
            {member.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.profileImageUrl} alt={member.nickname} className="h-full w-full object-cover" />
            ) : (
                <UserRound className="h-5 w-5" aria-hidden="true" />
            )}
        </div>
    );
}
