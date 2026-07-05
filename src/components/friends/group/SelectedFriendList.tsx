import { UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Friend } from "@/types/social";

type SelectedFriendListProps = {
    friends: Friend[];
    disabled: boolean;
    onRemove: (friendUserId: number) => void;
};

export default function SelectedFriendList({
    friends,
    disabled,
    onRemove,
}: SelectedFriendListProps) {
    const t = useTranslations("Social.friendGroupCreatePage.selected");

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {friends.map((friend) => (
                <article
                    key={friend.friendUserId}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5"
                >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-100 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                        {friend.profileImageUrl ? (
                            // TODO: TranslaCat 이미지 업로드 방식 전환 시 next/image 적용 검토
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={friend.profileImageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <UserRound className="h-6 w-6" aria-hidden="true" />
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                            {friend.nickname}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {friend.publicId}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => onRemove(friend.friendUserId)}
                        disabled={disabled}
                        aria-label={t("remove", { nickname: friend.nickname })}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </article>
            ))}
        </div>
    );
}
