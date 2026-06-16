import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { AccountBookMember } from "@/types/accountBook";

type AccountBookMemberListItemProps = {
    member: AccountBookMember;
    isBusy: boolean;
    onClickRemove: (member: AccountBookMember) => void;
};

export default function AccountBookMemberListItem({
    member,
    isBusy,
    onClickRemove,
}: AccountBookMemberListItemProps) {
    const t = useTranslations("AccountBook.memberModal");
    const isOwner = member.role === "OWNER";

    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-black/25">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                        {member.username || member.publicId}
                    </p>

                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                        {t(`roles.${member.role}`)}
                    </span>
                </div>

                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    {member.publicId}
                </p>
            </div>

            {!isOwner && (
                <button
                    type="button"
                    onClick={() => onClickRemove(member)}
                    disabled={isBusy}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 ring-1 ring-red-100 transition hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20 dark:hover:bg-red-500/20"
                    aria-label={t("actions.removeMemberAria", {
                        name: member.username || member.publicId,
                    })}
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>
    );
}