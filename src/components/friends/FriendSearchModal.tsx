import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, Loader2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import FriendHelpModal from "@/components/friends/FriendHelpModal";
import UserSearchResultCard from "@/components/user-search/UserSearchResultCard";
import { usePublicIdUserSearch } from "@/hooks/user-search/usePublicIdUserSearch";

type FriendSearchModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function FriendSearchModal({
    isOpen,
    onClose,
}: FriendSearchModalProps) {
    const t = useTranslations("Social.userSearchPage");
    const tFriendList = useTranslations("Social.friendListPage");
    const userSearch = usePublicIdUserSearch();
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                if (isHelpModalOpen) {
                    setIsHelpModalOpen(false);
                    return;
                }

                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isHelpModalOpen, isOpen, onClose]);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await userSearch.search();
    };

    const shouldShowResultArea =
        userSearch.isSearching ||
        userSearch.result !== null ||
        userSearch.hasSearched;

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm dark:bg-black/60"
                role="presentation"
                onClick={onClose}
            >
                <section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="friend-search-modal-title"
                    className="max-h-[min(760px,calc(100vh-48px))] w-full max-w-2xl overflow-hidden rounded-4xl border border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                >
                    <header className="flex items-start justify-between gap-4 p-5">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                                {t("eyebrow")}
                            </p>
                            <h2
                                id="friend-search-modal-title"
                                className="mt-2 text-xl font-black text-slate-950 dark:text-white"
                            >
                                {t("title")}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                {t("description")}
                            </p>
                        </div>

                        <div className="flex shrink-0 gap-1">
                            <button
                                type="button"
                                onClick={() => setIsHelpModalOpen(true)}
                                aria-label={tFriendList("actions.openHelp")}
                                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-orange-500 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-orange-200"
                            >
                                <CircleHelp
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                />
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label={tFriendList(
                                    "actions.closeSearchModal",
                                )}
                                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                    </header>

                    <div className="max-h-[calc(100vh-240px)] overflow-y-auto border-t border-slate-200 p-5 dark:border-white/10">
                        <form
                            onSubmit={handleSubmit}
                            className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"
                        >
                            <label className="block">
                                <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                                    {t("form.fields.publicId")}
                                </span>
                                <span className="relative mt-2 block">
                                    <Search
                                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                        aria-hidden="true"
                                    />
                                    <input
                                        type="text"
                                        value={userSearch.publicId}
                                        onChange={(event) =>
                                            userSearch.updatePublicId(
                                                event.target.value,
                                            )
                                        }
                                        placeholder={t(
                                            "form.placeholders.publicId",
                                        )}
                                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
                                    />
                                </span>
                            </label>

                            {userSearch.searchErrorCode ===
                                "PUBLIC_ID_REQUIRED" && (
                                <p className="mt-3 text-sm font-bold text-rose-500">
                                    {t("messages.publicIdRequired")}
                                </p>
                            )}

                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={userSearch.clearResult}
                                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                                >
                                    {t("form.actions.clear")}
                                </button>
                                <button
                                    type="submit"
                                    disabled={userSearch.isSearching}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                                >
                                    {userSearch.isSearching && (
                                        <Loader2
                                            className="h-4 w-4 animate-spin"
                                            aria-hidden="true"
                                        />
                                    )}
                                    {userSearch.isSearching
                                        ? t("form.actions.searching")
                                        : t("form.actions.search")}
                                </button>
                            </div>
                        </form>

                        {shouldShowResultArea && (
                            <div className="mt-5">
                                {userSearch.isSearching ? (
                                    <ModalSearchState
                                        title={t("state.searchingTitle")}
                                        description={t(
                                            "state.searchingDescription",
                                        )}
                                    />
                                ) : userSearch.result ? (
                                    <UserSearchResultCard
                                        result={userSearch.result}
                                        isSendingRequest={
                                            userSearch.isSendingRequest
                                        }
                                        isStartingChat={
                                            userSearch.isStartingChat
                                        }
                                        actionErrorCode={
                                            userSearch.actionErrorCode
                                        }
                                        actionSuccessCode={
                                            userSearch.actionSuccessCode
                                        }
                                        onSendFriendRequest={
                                            userSearch.sendFriendRequest
                                        }
                                        onStartDirectChat={
                                            userSearch.startDirectChat
                                        }
                                    />
                                ) : userSearch.searchErrorCode ===
                                  "NOT_FOUND" ? (
                                    <ModalSearchState
                                        title={t("state.notFoundTitle")}
                                        description={t(
                                            "state.notFoundDescription",
                                        )}
                                    />
                                ) : userSearch.searchErrorCode ===
                                  "SEARCH_FAILED" ? (
                                    <ModalSearchState
                                        variant="error"
                                        title={t("state.failedTitle")}
                                        description={t(
                                            "state.failedDescription",
                                        )}
                                    />
                                ) : null}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <FriendHelpModal
                isOpen={isHelpModalOpen}
                variant="friendSearch"
                onClose={() => setIsHelpModalOpen(false)}
            />
        </>,
        document.body,
    );
}

type ModalSearchStateProps = {
    title: string;
    description: string;
    variant?: "default" | "error";
};

function ModalSearchState({
    title,
    description,
    variant = "default",
}: ModalSearchStateProps) {
    const isError = variant === "error";

    return (
        <div
            className={`rounded-3xl px-5 py-8 text-center ${
                isError
                    ? "border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                    : "border border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            }`}
        >
            <h3
                className={`text-lg font-black ${
                    isError
                        ? "text-rose-600 dark:text-rose-200"
                        : "text-slate-950 dark:text-white"
                }`}
            >
                {title}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6">
                {description}
            </p>
        </div>
    );
}
