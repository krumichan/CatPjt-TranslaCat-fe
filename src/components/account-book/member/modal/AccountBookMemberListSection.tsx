import { useTranslations } from "next-intl";

import { AccountBookMember } from "@/types/accountBook";
import AccountBookMemberListItem from "@/components/account-book/member/modal/AccountBookMemberListItem";

type AccountBookMemberListSectionProps = {
    members: AccountBookMember[];
    isLoading: boolean;
    isError: unknown;
    isBusy: boolean;
    onClickRemove: (member: AccountBookMember) => void;
};

export default function AccountBookMemberListSection({
    members,
    isLoading,
    isError,
    isBusy,
    onClickRemove,
}: AccountBookMemberListSectionProps) {
    const t = useTranslations("AccountBook.memberModal");

    return (
        <section>
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t("memberList.title")}
                </h3>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                    {t("memberList.count", {
                        count: members.length,
                    })}
                </span>
            </div>

            {isLoading ? (
                <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:bg-white/10 dark:text-slate-400">
                    {t("messages.loading")}
                </p>
            ) : isError ? (
                <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-500 dark:bg-red-500/10 dark:text-red-300">
                    {t("messages.loadFailed")}
                </p>
            ) : members.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:bg-white/10 dark:text-slate-400">
                    {t("memberList.empty")}
                </p>
            ) : (
                <div className="space-y-2">
                    {members.map((member) => (
                        <AccountBookMemberListItem
                            key={member.id}
                            member={member}
                            isBusy={isBusy}
                            onClickRemove={onClickRemove}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}