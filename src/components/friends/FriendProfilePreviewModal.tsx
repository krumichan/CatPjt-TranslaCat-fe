import { createPortal } from "react-dom";
import {
    IdCard,
    Loader2,
    MessageCircle,
    UserRound,
    X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useFriendProfilePreviewModal } from "@/hooks/friends/useFriendProfilePreviewModal";
import type { Friend } from "@/types/social";

type FriendProfilePreviewModalProps = {
    isOpen: boolean;
    friend: Friend | null;
    isStartingChat: boolean;
    onClose: () => void;
    onStartDirectChat: () => Promise<boolean>;
};

export default function FriendProfilePreviewModal({
    isOpen,
    friend,
    isStartingChat,
    onClose,
onStartDirectChat,
}: FriendProfilePreviewModalProps) {
    const t = useTranslations("Social.friendListPage.profilePreview");

    useFriendProfilePreviewModal({
        isOpen,
        isProcessing: isStartingChat,
        onClose,
    });

    if (!isOpen || !friend || typeof document === "undefined") {
        return null;
    }

    const bio = friend.bio?.trim() || t("emptyBio");

    return createPortal(
        <div
            className="fixed inset-0 z-1200 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm sm:items-center sm:py-10"
            onMouseDown={() => {
                if (!isStartingChat) {
                    onClose();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="friend-profile-preview-title"
                className="relative flex w-full max-w-md flex-col overflow-hidden rounded-4xl border border-white/20 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-112 overflow-hidden bg-linear-to-br from-orange-100 via-amber-50 to-slate-100 dark:from-orange-500/20 dark:via-slate-900 dark:to-slate-950">
                    {friend.profileBackgroundImageUrl ? (
                        // TODO: 실제 Storage public domain 확정 후 next/image 적용 재검토
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={friend.profileBackgroundImageUrl}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover object-center"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-linear-to-br from-orange-100 via-amber-50 to-slate-100 dark:from-orange-500/20 dark:via-slate-900 dark:to-slate-950" />
                    )}

                    <div className="absolute inset-0 bg-linear-to-b from-black/5 via-slate-950/10 to-white dark:to-slate-950" />
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    disabled={isStartingChat}
                    aria-label={t("close")}
                    className="absolute right-4 top-4 z-30 rounded-full bg-slate-950/60 p-2 text-white shadow-sm backdrop-blur-sm transition hover:bg-slate-950/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>

                <div className="relative z-10 flex flex-col overflow-x-hidden px-6 pb-6">
                    <div className="flex flex-col items-center pt-[42%] sm:pt-[40%]">
                        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-linear-to-br from-orange-400 to-amber-300 text-white shadow-xl dark:border-slate-950">
                            {friend.profileImageUrl ? (
                                // TODO: 실제 Storage public domain 확정 후 next/image 적용 재검토
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={friend.profileImageUrl}
                                    alt={t("profileAlt", {
                                        nickname: friend.nickname,
                                    })}
                                    className="h-full w-full object-cover object-center"
                                />
                            ) : (
                                <UserRound
                                    className="h-12 w-12"
                                    aria-hidden="true"
                                />
                            )}
                        </div>

                        <h2
                            id="friend-profile-preview-title"
                            className="mt-4 text-center text-2xl font-black text-slate-900 dark:text-white"
                        >
                            {friend.nickname}
                        </h2>

                        <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100/90 px-3 py-1.5 text-xs font-bold text-slate-500 backdrop-blur-sm dark:bg-white/10 dark:text-slate-300">
                            <IdCard
                                className="h-3.5 w-3.5 shrink-0"
                                aria-hidden="true"
                            />
                            <code className="truncate">
                                {friend.publicId}
                            </code>
                        </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/90 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">
                            {t("bio")}
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {bio}
                        </p>
                    </div>

                    <p className="mt-4 text-center text-xs text-slate-400">
                        {t("friendSince", {
                            date: friend.friendSince,
                        })}
                    </p>

                    <button
                        type="button"
                        disabled={isStartingChat}
                        onClick={() => void onStartDirectChat()}
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                    >
                        {isStartingChat ? (
                            <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <MessageCircle
                                className="h-4 w-4"
                                aria-hidden="true"
                            />
                        )}

                        {isStartingChat
                            ? t("startingChat")
                            : t("startChat")}
                    </button>
                </div>
            </section>
        </div>,
        document.body,
    );
}