import { UserRound } from "lucide-react";

import type { Friend } from "@/types/social";

type FriendSummaryForConfirmProps = {
    friend: Friend;
};

export default function FriendSummaryForConfirm({
    friend,
}: FriendSummaryForConfirmProps) {
    return (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-200">
                {friend.profileImageUrl ? (
                    // TODO: TranslaCat 이미지 업로드 방식 전환 시 next/image 적용 검토
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={friend.profileImageUrl}
                        alt={friend.nickname}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <UserRound className="h-5 w-5" aria-hidden="true" />
                )}
            </div>

            <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {friend.nickname}
                </p>
                <code className="mt-1 block truncate text-xs text-slate-400">
                    {friend.publicId}
                </code>
            </div>
        </div>
    );
}
