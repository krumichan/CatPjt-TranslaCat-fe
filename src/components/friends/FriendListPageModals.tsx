"use client";

import { useTranslations } from "next-intl";

import ConfirmModal from "@/components/common/ConfirmModal";
import BlockListModal from "@/components/friends/BlockListModal";
import FriendHelpModal from "@/components/friends/FriendHelpModal";
import FriendProfilePreviewModal from "@/components/friends/FriendProfilePreviewModal";
import FriendSearchModal from "@/components/friends/FriendSearchModal";
import FriendSummaryForConfirm from "@/components/friends/FriendSummaryForConfirm";
import { useFriendList } from "@/hooks/friends/useFriendList";
import { useFriendListConfirmActions } from "@/hooks/friends/useFriendListConfirmActions";
import {
    type FriendConfirmTargetType,
    useFriendListPageModals,
} from "@/hooks/friends/useFriendListPageModals";
import { useFriendProfilePreview } from "@/hooks/friends/useFriendProfilePreview";

type TranslationFunction = ReturnType<typeof useTranslations>;

type FriendListPageModalsProps = {
    friendList: ReturnType<typeof useFriendList>;
    modals: ReturnType<typeof useFriendListPageModals>;
    profilePreview: ReturnType<typeof useFriendProfilePreview>;
    confirmActions: ReturnType<typeof useFriendListConfirmActions>;
};

export default function FriendListPageModals({
    friendList,
    modals,
    profilePreview,
    confirmActions,
}: FriendListPageModalsProps) {
    const tDeleteModal = useTranslations(
        "Social.friendListPage.deleteModal",
    );
    const tBlockModal = useTranslations(
        "Social.friendListPage.blockModal",
    );

    const confirmModalCopy = getConfirmModalCopy(
        modals.confirmTarget?.type,
        tDeleteModal,
        tBlockModal,
    );

    return (
        <>
            <FriendSearchModal
                isOpen={modals.isFriendSearchModalOpen}
                onClose={modals.closeFriendSearchModal}
            />

            <FriendHelpModal
                isOpen={modals.isHelpModalOpen}
                variant="friendList"
                onClose={modals.closeHelpModal}
            />

            <BlockListModal
                isOpen={modals.isBlockListModalOpen}
                blocks={friendList.blockedUsers}
                isLoading={friendList.isBlockLoading}
                unblockingUserId={
                    friendList.unblockingFriendUserId
                }
                onClose={modals.closeBlockListModal}
                onUnblock={friendList.unblockFriend}
            />

            <FriendProfilePreviewModal
                isOpen={profilePreview.isProfilePreviewOpen}
                friend={profilePreview.previewFriend}
                isStartingChat={
                    profilePreview.previewFriend !== null &&
                    friendList.startingChatFriendUserId ===
                    profilePreview.previewFriend.friendUserId
                }
                onClose={profilePreview.closeProfilePreview}
                onStartDirectChat={
                    profilePreview.startDirectChatFromPreview
                }
            />

            {modals.confirmTarget && (
                <ConfirmModal
                    isOpen={Boolean(modals.confirmTarget)}
                    title={confirmModalCopy.title}
                    description={confirmModalCopy.description(
                        modals.confirmTarget.friend.nickname,
                    )}
                    helpMessage={confirmModalCopy.help}
                    helpButtonLabel={confirmModalCopy.helpButton}
                    cancelLabel={confirmModalCopy.cancel}
                    confirmLabel={confirmModalCopy.confirm}
                    variant="danger"
                    isLoading={confirmActions.isConfirmProcessing}
                    onClose={confirmActions.handleCloseConfirmModal}
                    onConfirm={confirmActions.handleConfirmAction}
                >
                    <FriendSummaryForConfirm
                        friend={modals.confirmTarget.friend}
                    />
                </ConfirmModal>
            )}
        </>
    );
}

function getConfirmModalCopy(
    type: FriendConfirmTargetType | undefined,
    tDeleteModal: TranslationFunction,
    tBlockModal: TranslationFunction,
) {
    if (type === "BLOCK") {
        return {
            title: tBlockModal("title"),
            description: (nickname: string) =>
                tBlockModal("description", { nickname }),
            help: tBlockModal("help"),
            helpButton: tBlockModal("helpButton"),
            confirm: tBlockModal("confirm"),
            cancel: tBlockModal("cancel"),
        };
    }

    return {
        title: tDeleteModal("title"),
        description: (nickname: string) =>
            tDeleteModal("description", { nickname }),
        help: tDeleteModal("help"),
        helpButton: tDeleteModal("helpButton"),
        confirm: tDeleteModal("confirm"),
        cancel: tDeleteModal("cancel"),
    };
}