"use client";

import { ChatMemberRelationNotice } from "@/components/chat/room/modal/ChatMemberRelationNotice";
import type { ChatMemberFriendRequestErrorCode } from "@/hooks/chat/useChatMemberProfilePreview";
import type { ChatRoomMemberProfile } from "@/types/chat";
import { Loader2, Send, UserCheck, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";

export function ChatMemberFriendRelationAction({
    profile,
    isSending,
    errorCode,
    onSend,
}: {
    profile: ChatRoomMemberProfile;
    isSending: boolean;
    errorCode:
        | ChatMemberFriendRequestErrorCode
        | null;
    onSend: () => Promise<boolean>;
}) {
    const t = useTranslations(
        "ChatRoom.memberProfile.friendAction",
    );

    return (
        <div className="mt-6">
            {profile.friendStatus === "NONE" && (
                <button
                    type="button"
                    disabled={isSending}
                    onClick={() => void onSend()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                >
                    {isSending ? (
                        <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                        />
                    ) : (
                        <Send
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                    )}

                    {isSending
                        ? t("sending")
                        : t("send")}
                </button>
            )}

            {profile.friendStatus ===
                "REQUEST_SENT" && (
                <ChatMemberRelationNotice
                    icon={
                        <UserCheck
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                    }
                    text={t("sent")}
                />
            )}

            {profile.friendStatus ===
                "REQUEST_RECEIVED" && (
                <ChatMemberRelationNotice
                    icon={
                        <UserMinus
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                    }
                    text={t("received")}
                />
            )}

            {errorCode && (
                <p
                    role="alert"
                    className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                >
                    {t(`errors.${errorCode}`)}
                </p>
            )}
        </div>
    );
}
