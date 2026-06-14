import { SyntheticEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@/hooks/useQuery";
import { AccountBookMember } from "@/types/accountBook";
import { accountBookMemberService } from "@/services/account-book/accountBookMemberService";
import ConfirmModal from "@/components/common/ConfirmModal";

type AccountBookMemberManageModalProps = {
    accountBookId: number;
    accountBookName?: string;
    onClose: () => void;
};

export default function AccountBookMemberManageModal({
    accountBookId,
    accountBookName,
    onClose,
}: AccountBookMemberManageModalProps) {
    const t = useTranslations("AccountBook.memberModal");

    const [publicId, setPublicId] = useState("");
    const [isInviting, setIsInviting] = useState(false);
    const isInvitingRef = useRef(false);

    const [removingMember, setRemovingMember] =
        useState<AccountBookMember | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    const {
        data: members = [],
        isLoading,
        isError,
        mutate: mutateMembers,
    } = useQuery({
        keys: ["account-book-members", accountBookId] as const,
        fetcher: (_, accountBookId) =>
            accountBookMemberService.listMembers(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    if (typeof document === "undefined") {
        return null;
    }

    const trimmedPublicId = publicId.trim().toUpperCase();
    const canInvite = trimmedPublicId.length > 0 && !isInviting;

    const handleClose = () => {
        if (isInviting || isRemoving) {
            return;
        }

        setPublicId("");
        onClose();
    };

    const handleInvite = async (event: SyntheticEvent) => {
        event.preventDefault();

        if (!canInvite || isInvitingRef.current) {
            return;
        }

        isInvitingRef.current = true;
        setIsInviting(true);

        try {
            const invitedMember = await accountBookMemberService.inviteMember(
                accountBookId,
                {
                    publicId: trimmedPublicId,
                }
            );

            await mutateMembers((currentData) => {
                if (!currentData) {
                    return [invitedMember];
                }

                const exists = currentData.some(
                    (member) => member.userId === invitedMember.userId
                );

                if (exists) {
                    return currentData.map((member) =>
                        member.userId === invitedMember.userId
                            ? invitedMember
                            : member
                    );
                }

                return [...currentData, invitedMember];
            }, false);

            setPublicId("");
            await mutateMembers((currentData) => currentData, true);
        } catch (error) {
            console.error(error);
            window.alert(t("messages.inviteFailed"));
        } finally {
            isInvitingRef.current = false;
            setIsInviting(false);
        }
    };

    const handleRemoveMember = async () => {
        if (!removingMember || isRemoving) {
            return;
        }

        const targetUserId = removingMember.userId;

        try {
            setIsRemoving(true);

            await accountBookMemberService.removeMember(
                accountBookId,
                targetUserId
            );

            await mutateMembers((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.filter(
                    (member) => member.userId !== targetUserId
                );
            }, false);

            setRemovingMember(null);
            await mutateMembers((currentData) => currentData, true);
        } catch (error) {
            console.error(error);
            window.alert(t("messages.removeFailed"));
            throw error;
        } finally {
            setIsRemoving(false);
        }
    };

    return createPortal(
        <>
            <div className="fixed inset-0 z-9999 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 backdrop-blur-sm">
                <div className="w-full max-w-2xl rounded-3xl border border-white/70 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:p-8">
                    <div className="mb-6 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
                                {t("eyebrow")}
                            </p>
                            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                                {t("title")}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                {accountBookName
                                    ? t("descriptionWithName", {
                                        name: accountBookName,
                                    })
                                    : t("description")}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isInviting || isRemoving}
                            className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label={t("actions.close")}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form
                        onSubmit={handleInvite}
                        className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"
                    >
                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                {t("fields.publicId")}
                            </span>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <input
                                    value={publicId}
                                    onChange={(event) =>
                                        setPublicId(event.target.value)
                                    }
                                    disabled={isInviting || isRemoving}
                                    placeholder={t("placeholders.publicId")}
                                    className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-orange-500/20"
                                />

                                <button
                                    type="submit"
                                    disabled={!canInvite || isRemoving}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    {isInviting
                                        ? t("actions.inviting")
                                        : t("actions.invite")}
                                </button>
                            </div>
                        </label>

                        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                            {t("helps.publicId")}
                        </p>
                    </form>

                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">
                                {t("memberList.title")}
                            </h3>
                            <span className="text-xs font-semibold text-slate-400">
                                {t("memberList.count", {
                                    count: members.length,
                                })}
                            </span>
                        </div>

                        {isLoading ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                {t("messages.loading")}
                            </div>
                        ) : isError ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-500 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                                {t("messages.loadFailed")}
                            </div>
                        ) : members.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                {t("memberList.empty")}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {members.map((member) => {
                                    const isOwner = member.role === "OWNER";

                                    return (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black/20"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm font-bold text-slate-800 dark:text-white">
                                                        {member.username ||
                                                            member.publicId}
                                                    </p>
                                                    <span
                                                        className={
                                                            isOwner
                                                                ? "rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-black text-orange-600 dark:bg-orange-500/15 dark:text-orange-300"
                                                                : "rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300"
                                                        }
                                                    >
                                                        {t(
                                                            `roles.${member.role}`
                                                        )}
                                                    </span>
                                                </div>

                                                <p className="mt-1 truncate text-xs text-slate-400">
                                                    {member.publicId}
                                                </p>
                                            </div>

                                            {!isOwner && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setRemovingMember(
                                                            member
                                                        )
                                                    }
                                                    disabled={
                                                        isInviting ||
                                                        isRemoving
                                                    }
                                                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 ring-1 ring-red-100 transition hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20 dark:hover:bg-red-500/20"
                                                    aria-label={t(
                                                        "actions.removeMemberAria",
                                                        {
                                                            name:
                                                                member.username ||
                                                                member.publicId,
                                                        }
                                                    )}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <ConfirmModal
                isOpen={removingMember !== null}
                title={t("removeConfirm.title")}
                description={t("removeConfirm.description", {
                    name:
                        removingMember?.username ||
                        removingMember?.publicId ||
                        "",
                })}
                confirmLabel={t("removeConfirm.confirm")}
                cancelLabel={t("removeConfirm.cancel")}
                variant="danger"
                isLoading={isRemoving}
                onClose={() => {
                    if (!isRemoving) {
                        setRemovingMember(null);
                    }
                }}
                onConfirm={handleRemoveMember}
            />
        </>,
        document.body
    );
}
