"use client";

import {
    AlertCircle,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    UserPlus,
    X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type SyntheticEvent,
    type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import type {
    ChatRoom,
} from "@/types/chat";
import type { Friend } from "@/types/social";
import type {
    ChatRoomInvitationErrorCode,
} from "@/hooks/chat/useChatRoomInvitation";

interface ChatRoomInvitationModalProps {
    isOpen: boolean;
    room: ChatRoom;
    friends: Friend[];
    selectedFriendUserIds: number[];
    publicIdInput: string;
    targetPublicIds: string[];
    groupName: string;
    groupDescription: string;
    isFriendLoading: boolean;
    isSubmitting: boolean;
    errorCode:
        | ChatRoomInvitationErrorCode
        | null;
    onClose: () => void;
    onToggleFriend: (
        friendUserId: number,
    ) => void;
    onUpdatePublicIdInput: (
        value: string,
    ) => void;
    onAddPublicId: () => boolean;
    onRemovePublicId: (
        publicId: string,
    ) => void;
    onUpdateGroupName: (
        value: string,
    ) => void;
    onUpdateGroupDescription: (
        value: string,
    ) => void;
    onSubmit: () => Promise<boolean>;
    onReloadFriends: () => Promise<void>;
}

export function ChatRoomInvitationModal({
    isOpen,
    room,
    friends,
    selectedFriendUserIds,
    publicIdInput,
    targetPublicIds,
    groupName,
    groupDescription,
    isFriendLoading,
    isSubmitting,
    errorCode,
    onClose,
    onToggleFriend,
    onUpdatePublicIdInput,
    onAddPublicId,
    onRemovePublicId,
    onUpdateGroupName,
    onUpdateGroupDescription,
    onSubmit,
    onReloadFriends,
}: ChatRoomInvitationModalProps) {
    const t = useTranslations("ChatRoom");
    const closeButtonRef =
        useRef<HTMLButtonElement>(null);
    const [searchKeyword, setSearchKeyword] =
        useState("");

    const isDirectConversion =
        room.roomType === "DIRECT" &&
        room.sourceType === "FRIEND";

    const selectedSet = useMemo(
        () => new Set(selectedFriendUserIds),
        [selectedFriendUserIds],
    );

    const filteredFriends = useMemo(() => {
        const keyword = searchKeyword
            .trim()
            .toLowerCase();

        if (!keyword) {
            return friends;
        }

        return friends.filter(
            (friend) =>
                friend.nickname
                    .toLowerCase()
                    .includes(keyword) ||
                friend.publicId
                    .toLowerCase()
                    .includes(keyword),
        );
    }, [friends, searchKeyword]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow =
            document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const focusTimer = window.setTimeout(() => {
            closeButtonRef.current?.focus();
        }, 0);

        const handleKeyDown = (
            event: globalThis.KeyboardEvent,
        ) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            window.clearTimeout(focusTimer);
            document.body.style.overflow =
                previousOverflow;
            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [isOpen, onClose]);

    if (
        !isOpen ||
        typeof document === "undefined"
    ) {
        return null;
    }

    const handlePublicIdKeyDown = (
        event: KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key !== "Enter") {
            return;
        }

        event.preventDefault();
        onAddPublicId();
    };

    const handleSubmit = async (
        event: SyntheticEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();
        await onSubmit();
    };

    const selectedCount =
        selectedFriendUserIds.length +
        targetPublicIds.length;

    return createPortal(
        <div
            className="fixed inset-0 z-1150 flex items-center justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-sm sm:px-6"
            onMouseDown={onClose}
        >
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="chat-room-invitation-title"
                onSubmit={handleSubmit}
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
                className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl dark:bg-slate-950"
                data-testid="chat-room-invitation-modal"
            >
                <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-500">
                            {t(
                                "invitation.eyebrow",
                            )}
                        </p>
                        <h2
                            id="chat-room-invitation-title"
                            className="mt-1 text-xl font-black text-slate-900 dark:text-white"
                        >
                            {isDirectConversion
                                ? t(
                                      "invitation.directTitle",
                                  )
                                : t(
                                      "invitation.groupTitle",
                                  )}
                        </h2>
                    </div>

                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label={t(
                            "invitation.close",
                        )}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X
                            className="h-5 w-5"
                            aria-hidden="true"
                        />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                    {isDirectConversion && (
                        <section className="rounded-3xl border border-orange-200 bg-orange-50/80 p-4 dark:border-orange-400/30 dark:bg-orange-500/10">
                            <p className="text-sm font-black text-orange-700 dark:text-orange-200">
                                {t(
                                    "invitation.directNotice.title",
                                )}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-orange-700/80 dark:text-orange-100/80">
                                {t(
                                    "invitation.directNotice.description",
                                )}
                            </p>

                            <div className="mt-4 grid gap-4">
                                <label className="block">
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                                        {t(
                                            "invitation.fields.groupName",
                                        )}
                                        <span
                                            className="ml-1 text-orange-500"
                                            aria-hidden="true"
                                        >
                                            *
                                        </span>
                                    </span>
                                    <input
                                        type="text"
                                        value={groupName}
                                        maxLength={100}
                                        disabled={isSubmitting}
                                        onChange={(
                                            event,
                                        ) =>
                                            onUpdateGroupName(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-2 w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-orange-400/30 dark:bg-slate-900 dark:text-white dark:focus:ring-orange-500/10"
                                        placeholder={t(
                                            "invitation.placeholders.groupName",
                                        )}
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                                        {t(
                                            "invitation.fields.groupDescription",
                                        )}
                                    </span>
                                    <textarea
                                        value={
                                            groupDescription
                                        }
                                        maxLength={500}
                                        rows={3}
                                        disabled={isSubmitting}
                                        onChange={(
                                            event,
                                        ) =>
                                            onUpdateGroupDescription(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="mt-2 w-full resize-y rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-orange-400/30 dark:bg-slate-900 dark:text-white dark:focus:ring-orange-500/10"
                                        placeholder={t(
                                            "invitation.placeholders.groupDescription",
                                        )}
                                    />
                                </label>
                            </div>
                        </section>
                    )}

                    <section className={isDirectConversion ? "mt-6" : ""}>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                    {t(
                                        "invitation.friends.title",
                                    )}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {t(
                                        "invitation.friends.description",
                                    )}
                                </p>
                            </div>

                            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-200">
                                {t(
                                    "invitation.selectedCount",
                                    {
                                        count:
                                            selectedCount,
                                    },
                                )}
                            </span>
                        </div>

                        <div className="relative mt-4">
                            <Search
                                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                aria-hidden="true"
                            />
                            <input
                                type="search"
                                value={searchKeyword}
                                onChange={(event) =>
                                    setSearchKeyword(
                                        event.target.value,
                                    )
                                }
                                placeholder={t(
                                    "invitation.friends.searchPlaceholder",
                                )}
                                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:ring-orange-500/10"
                            />
                        </div>

                        {isFriendLoading ? (
                            <div className="mt-4 flex items-center justify-center rounded-3xl border border-slate-200 py-10 text-sm font-bold text-slate-400 dark:border-white/10">
                                <Loader2
                                    className="mr-2 h-5 w-5 animate-spin"
                                    aria-hidden="true"
                                />
                                {t(
                                    "invitation.friends.loading",
                                )}
                            </div>
                        ) : errorCode ===
                          "FRIEND_LOAD_FAILED" ? (
                            <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-center dark:border-rose-400/30 dark:bg-rose-500/10">
                                <AlertCircle
                                    className="mx-auto h-7 w-7 text-rose-500"
                                    aria-hidden="true"
                                />
                                <p className="mt-3 text-sm font-bold text-rose-600 dark:text-rose-200">
                                    {t(
                                        "invitation.friends.loadFailed",
                                    )}
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        void onReloadFriends()
                                    }
                                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-xs font-black text-white"
                                >
                                    <RefreshCw
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    {t(
                                        "invitation.friends.retry",
                                    )}
                                </button>
                            </div>
                        ) : filteredFriends.length ===
                          0 ? (
                            <div className="mt-4 rounded-3xl border border-dashed border-slate-300 py-9 text-center text-sm font-bold text-slate-400 dark:border-white/15">
                                {t(
                                    "invitation.friends.empty",
                                )}
                            </div>
                        ) : (
                            <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                                {filteredFriends.map(
                                    (friend) => {
                                        const checked =
                                            selectedSet.has(
                                                friend.friendUserId,
                                            );

                                        return (
                                            <label
                                                key={
                                                    friend.friendUserId
                                                }
                                                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${
                                                    checked
                                                        ? "border-orange-400 bg-orange-50 dark:border-orange-400 dark:bg-orange-500/10"
                                                        : "border-slate-200 bg-white hover:border-orange-200 dark:border-white/10 dark:bg-white/5 dark:hover:border-orange-400/30"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        checked
                                                    }
                                                    disabled={
                                                        isSubmitting
                                                    }
                                                    onChange={() =>
                                                        onToggleFriend(
                                                            friend.friendUserId,
                                                        )
                                                    }
                                                    className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                                />

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                                                        {
                                                            friend.nickname
                                                        }
                                                    </p>
                                                    <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        {
                                                            friend.publicId
                                                        }
                                                    </p>
                                                </div>
                                            </label>
                                        );
                                    },
                                )}
                            </div>
                        )}
                    </section>

                    <section className="mt-7 border-t border-slate-200 pt-6 dark:border-white/10">
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                            {t(
                                "invitation.publicIds.title",
                            )}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {t(
                                "invitation.publicIds.description",
                            )}
                        </p>

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <input
                                type="text"
                                value={publicIdInput}
                                disabled={isSubmitting}
                                onChange={(event) =>
                                    onUpdatePublicIdInput(
                                        event.target.value,
                                    )
                                }
                                onKeyDown={
                                    handlePublicIdKeyDown
                                }
                                placeholder={t(
                                    "invitation.placeholders.publicId",
                                )}
                                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold uppercase text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:ring-orange-500/10"
                            />
                            <button
                                type="button"
                                onClick={onAddPublicId}
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-300 px-4 py-3 text-sm font-black text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-400/40 dark:text-orange-200 dark:hover:bg-orange-500/10"
                            >
                                <Plus
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                                {t(
                                    "invitation.publicIds.add",
                                )}
                            </button>
                        </div>

                        {targetPublicIds.length >
                            0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {targetPublicIds.map(
                                    (publicId) => (
                                        <span
                                            key={
                                                publicId
                                            }
                                            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-200"
                                        >
                                            {publicId}
                                            <button
                                                type="button"
                                                disabled={
                                                    isSubmitting
                                                }
                                                onClick={() =>
                                                    onRemovePublicId(
                                                        publicId,
                                                    )
                                                }
                                                aria-label={t(
                                                    "invitation.publicIds.remove",
                                                    {
                                                        publicId,
                                                    },
                                                )}
                                                className="rounded-full p-0.5 transition hover:bg-slate-200 disabled:cursor-not-allowed dark:hover:bg-white/10"
                                            >
                                                <X
                                                    className="h-3.5 w-3.5"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </span>
                                    ),
                                )}
                            </div>
                        )}
                    </section>

                    {errorCode &&
                        errorCode !==
                            "FRIEND_LOAD_FAILED" && (
                        <p
                            role="alert"
                            className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                        >
                            {t(
                                `invitation.errors.${errorCode}`,
                            )}
                        </p>
                    )}
                </div>

                <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end dark:border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                        {t(
                            "invitation.cancel",
                        )}
                    </button>

                    <button
                        type="submit"
                        disabled={
                            isSubmitting ||
                            isFriendLoading
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                    >
                        {isSubmitting ? (
                            <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <UserPlus
                                className="h-4 w-4"
                                aria-hidden="true"
                            />
                        )}

                        {isSubmitting
                            ? t(
                                  "invitation.submitting",
                              )
                            : isDirectConversion
                              ? t(
                                    "invitation.createGroup",
                                )
                              : t(
                                    "invitation.invite",
                                )}
                    </button>
                </footer>
            </form>
        </div>,
        document.body,
    );
}

