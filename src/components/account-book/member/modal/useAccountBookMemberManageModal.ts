import { SyntheticEvent, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useQuery } from "@/hooks/useQuery";
import {
    AccountBookInvitation,
    AccountBookMember,
} from "@/types/accountBook";
import { accountBookInvitationService } from "@/services/account-book/accountBookInvitationService";
import { accountBookMemberService } from "@/services/account-book/accountBookMemberService";

type UseAccountBookMemberManageModalProps = {
    accountBookId: number;
    onClose: () => void;
};

export function useAccountBookMemberManageModal({
    accountBookId,
    onClose,
}: UseAccountBookMemberManageModalProps) {
    const t = useTranslations("AccountBook.memberModal");

    const [publicId, setPublicId] = useState("");
    const [isInviting, setIsInviting] = useState(false);
    const isInvitingRef = useRef(false);

    const [removingMember, setRemovingMember] =
        useState<AccountBookMember | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    const [cancelingInvitationId, setCancelingInvitationId] =
        useState<number | null>(null);

    const {
        data: members = [],
        isLoading: isMemberLoading,
        isError: isMemberError,
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

    const {
        data: pendingInvitations = [],
        isLoading: isInvitationLoading,
        isError: isInvitationError,
        mutate: mutatePendingInvitations,
    } = useQuery({
        keys: ["account-book-pending-invitations", accountBookId] as const,
        fetcher: (_, accountBookId) =>
            accountBookInvitationService.listPendingInvitations(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    const trimmedPublicId = publicId.trim().toUpperCase();

    const canInvite =
        trimmedPublicId.length > 0 && !isInviting && !isRemoving;

    const isBusy =
        isInviting || isRemoving || cancelingInvitationId !== null;

    const handleClose = () => {
        if (isBusy) {
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
            const invitation =
                await accountBookInvitationService.createInvitation(
                    accountBookId,
                    {
                        publicId: trimmedPublicId,
                    },
                );

            await mutatePendingInvitations((currentData) => {
                if (!currentData) {
                    return [invitation];
                }

                const exists = currentData.some(
                    (currentInvitation: AccountBookInvitation) =>
                        currentInvitation.id === invitation.id,
                );

                if (exists) {
                    return currentData.map(
                        (currentInvitation: AccountBookInvitation) =>
                            currentInvitation.id === invitation.id
                                ? invitation
                                : currentInvitation,
                    );
                }

                return [invitation, ...currentData];
            }, false);

            setPublicId("");

            await mutatePendingInvitations(
                (currentData) => currentData,
                true,
            );
        } catch (error) {
            console.error(error);
            window.alert(t("messages.inviteFailed"));
        } finally {
            isInvitingRef.current = false;
            setIsInviting(false);
        }
    };

    const handleCancelInvitation = async (invitationId: number) => {
        if (cancelingInvitationId !== null) {
            return;
        }

        try {
            setCancelingInvitationId(invitationId);

            await accountBookInvitationService.cancelInvitation(
                accountBookId,
                invitationId,
            );

            await mutatePendingInvitations((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.filter(
                    (invitation: AccountBookInvitation) =>
                        invitation.id !== invitationId,
                );
            }, false);

            await mutatePendingInvitations(
                (currentData) => currentData,
                true,
            );
        } catch (error) {
            console.error(error);
            window.alert(t("messages.cancelInvitationFailed"));
        } finally {
            setCancelingInvitationId(null);
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
                targetUserId,
            );

            await mutateMembers((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.filter(
                    (member: AccountBookMember) =>
                        member.userId !== targetUserId,
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

    const handleCloseRemoveConfirm = () => {
        if (isRemoving) {
            return;
        }

        setRemovingMember(null);
    };

    return {
        publicId,
        setPublicId,

        members,
        isMemberLoading,
        isMemberError,

        pendingInvitations,
        isInvitationLoading,
        isInvitationError,

        removingMember,
        setRemovingMember,

        isInviting,
        isRemoving,
        isBusy,
        canInvite,

        cancelingInvitationId,

        handleClose,
        handleInvite,
        handleCancelInvitation,
        handleRemoveMember,
        handleCloseRemoveConfirm,
    };
}