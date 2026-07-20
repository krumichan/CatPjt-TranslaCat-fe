import {
    Loader2,
    MessageCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

import UserProfilePreviewModal from "@/components/profile/UserProfilePreviewModal";
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
    const t = useTranslations(
        "Social.friendListPage.profilePreview",
    );

    const profile = friend
        ? {
              publicId: friend.publicId,
              displayName: friend.nickname,
              profileImageUrl: friend.profileImageUrl,
              profileBackgroundImageUrl:
                  friend.profileBackgroundImageUrl,
              bio: friend.bio,
          }
        : null;

    return (
        <UserProfilePreviewModal
            isOpen={isOpen}
            profile={profile}
            titleId="friend-profile-preview-title"
            closeLabel={t("close")}
            profileAlt={
                friend
                    ? t("profileAlt", {
                          nickname: friend.nickname,
                      })
                    : ""
            }
            bioLabel={t("bio")}
            emptyBioText={t("emptyBio")}
            isProcessing={isStartingChat}
            onClose={onClose}
        >
            {friend && (
                <>
                    <p className="mt-4 text-center text-xs text-slate-400">
                        {t("friendSince", {
                            date: friend.friendSince,
                        })}
                    </p>

                    <button
                        type="button"
                        disabled={isStartingChat}
                        onClick={() =>
                            void onStartDirectChat()
                        }
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
                </>
            )}
        </UserProfilePreviewModal>
    );
}
