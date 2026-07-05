"use client";

import {
    AlertCircle,
    ArrowLeft,
    Loader2,
    MessageCircleMore,
    UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { SyntheticEvent } from "react";

import SelectedFriendList from "@/components/friends/group/SelectedFriendList";
import StatePanel from "@/components/friends/group/StatePanel";
import { FRIEND_GROUP_ERROR_MESSAGE_KEYS } from "@/constants/friends/friendGroupChatCreate";
import { useFriendGroupChatCreate } from "@/hooks/friends/useFriendGroupChatCreate";

export default function FriendGroupChatCreatePageContent() {
    const t = useTranslations("Social.friendGroupCreatePage");
    const groupCreate = useFriendGroupChatCreate();

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        await groupCreate.createGroup();
    };

    const errorMessageKey = groupCreate.errorCode
        ? FRIEND_GROUP_ERROR_MESSAGE_KEYS[groupCreate.errorCode]
        : null;
    const errorMessage = errorMessageKey ? t(errorMessageKey) : null;
    const isBlockingError =
        groupCreate.errorCode === "LOAD_FAILED" ||
        (groupCreate.errorCode === "SELECTION_REQUIRED" &&
            groupCreate.selectedFriends.length === 0);

    return (
        <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 pt-24 sm:px-6 lg:px-8">
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
                <button
                    type="button"
                    onClick={groupCreate.backToFriendList}
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-orange-400/60 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t("actions.backToFriends")}
                </button>

                <div className="mt-5">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500">
                        {t("eyebrow")}
                    </p>
                    <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                        {t("title")}
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        {t("description")}
                    </p>
                </div>
            </section>

            {groupCreate.isLoading ? (
                <StatePanel
                    icon={
                        <Loader2
                            className="h-8 w-8 animate-spin"
                            aria-hidden="true"
                        />
                    }
                    title={t("state.loadingTitle")}
                    description={t("state.loadingDescription")}
                />
            ) : isBlockingError ? (
                <StatePanel
                    icon={<AlertCircle className="h-8 w-8" aria-hidden="true" />}
                    title={
                        groupCreate.errorCode === "LOAD_FAILED"
                            ? t("state.loadFailedTitle")
                            : t("state.selectionRequiredTitle")
                    }
                    description={
                        groupCreate.errorCode === "LOAD_FAILED"
                            ? t("state.loadFailedDescription")
                            : t("state.selectionRequiredDescription")
                    }
                    actionLabel={
                        groupCreate.errorCode === "LOAD_FAILED"
                            ? t("actions.reload")
                            : t("actions.backToFriends")
                    }
                    onAction={
                        groupCreate.errorCode === "LOAD_FAILED"
                            ? groupCreate.reload
                            : groupCreate.backToFriendList
                    }
                />
            ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <section className="rounded-4xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:shadow-none sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
                                    {t("selected.eyebrow")}
                                </p>
                                <h2 className="mt-2 flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                                    <UsersRound
                                        className="h-5 w-5 text-orange-500"
                                        aria-hidden="true"
                                    />
                                    {t("selected.title")}
                                </h2>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    {t("selected.count", {
                                        count: groupCreate.selectedFriends.length,
                                    })}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={groupCreate.backToFriendList}
                                disabled={groupCreate.isCreating}
                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-orange-400/60 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
                            >
                                {t("actions.changeSelection")}
                            </button>
                        </div>

                        <div className="mt-5">
                            <SelectedFriendList
                                friends={groupCreate.selectedFriends}
                                disabled={groupCreate.isCreating}
                                onRemove={groupCreate.removeFriend}
                            />
                        </div>
                    </section>

                    <section className="rounded-4xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:shadow-none sm:p-6">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
                                {t("form.eyebrow")}
                            </p>
                            <h2 className="mt-2 flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                                <MessageCircleMore
                                    className="h-5 w-5 text-orange-500"
                                    aria-hidden="true"
                                />
                                {t("form.title")}
                            </h2>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                {t("form.description")}
                            </p>
                        </div>

                        <div className="mt-6 space-y-5">
                            <label className="block">
                                <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                                    {t("form.fields.name")}
                                    <span className="ml-1 text-orange-500" aria-hidden="true">
                                        *
                                    </span>
                                </span>
                                <input
                                    type="text"
                                    value={groupCreate.name}
                                    onChange={(event) =>
                                        groupCreate.updateName(event.target.value)
                                    }
                                    disabled={groupCreate.isCreating}
                                    required
                                    autoFocus
                                    placeholder={t("form.placeholders.name")}
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-orange-400 dark:focus:ring-orange-500/10 dark:disabled:bg-slate-800"
                                />
                            </label>

                            <label className="block">
                                <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                                    {t("form.fields.description")}
                                </span>
                                <textarea
                                    value={groupCreate.description}
                                    onChange={(event) =>
                                        groupCreate.updateDescription(
                                            event.target.value,
                                        )
                                    }
                                    disabled={groupCreate.isCreating}
                                    rows={4}
                                    placeholder={t(
                                        "form.placeholders.description",
                                    )}
                                    className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-orange-400 dark:focus:ring-orange-500/10 dark:disabled:bg-slate-800"
                                />
                                <span className="mt-2 block text-xs font-semibold text-slate-400 dark:text-slate-500">
                                    {t("form.hints.descriptionOptional")}
                                </span>
                            </label>
                        </div>

                        {errorMessage && (
                            <p
                                role="alert"
                                className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-bold ${
                                    groupCreate.errorCode === "SELECTION_ADJUSTED"
                                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
                                        : "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                                }`}
                            >
                                {errorMessage}
                            </p>
                        )}

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={groupCreate.backToFriendList}
                                disabled={groupCreate.isCreating}
                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                            >
                                {t("actions.cancel")}
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    groupCreate.isCreating ||
                                    groupCreate.selectedFriends.length === 0
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                            >
                                {groupCreate.isCreating && (
                                    <Loader2
                                        className="h-4 w-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                )}
                                {groupCreate.isCreating
                                    ? t("actions.creating")
                                    : t("actions.create")}
                            </button>
                        </div>
                    </section>
                </form>
            )}
        </main>
    );
}
