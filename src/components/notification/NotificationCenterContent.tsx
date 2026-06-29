import { useTranslations } from "next-intl";

import NotificationEmptyState from "@/components/notification/NotificationEmptyState";
import NotificationInvitationPanel from "@/components/notification/NotificationInvitationPanel";
import type {
    FriendRequestAction,
    NotificationTab,
} from "@/components/notification/useNotificationCenter";
import type { AccountBookInvitation } from "@/types/accountBook";
import type { FriendRequest } from "@/types/social";

type NotificationCenterContentProps = {
    activeTab: NotificationTab;

    accountBookInvitations: AccountBookInvitation[];
    isAccountBookInvitationLoading: boolean;
    isAccountBookInvitationError: unknown;
    processingAccountBookInvitationId: number | null;
    onAcceptAccountBookInvitation: (invitationId: number) => void;
    onRejectAccountBookInvitation: (invitationId: number) => void;

    receivedFriendRequests: FriendRequest[];
    sentFriendRequests: FriendRequest[];
    isReceivedFriendRequestLoading: boolean;
    isReceivedFriendRequestError: unknown;
    isSentFriendRequestLoading: boolean;
    isSentFriendRequestError: unknown;
    processingFriendRequestId: number | null;
    processingFriendRequestAction: FriendRequestAction | null;
    onAcceptFriendRequest: (requestId: number) => void;
    onRejectFriendRequest: (requestId: number) => void;
    onCancelFriendRequest: (requestId: number) => void;
};

export default function NotificationCenterContent({
    activeTab,

    accountBookInvitations,
    isAccountBookInvitationLoading,
    isAccountBookInvitationError,
    processingAccountBookInvitationId,
    onAcceptAccountBookInvitation,
    onRejectAccountBookInvitation,

    receivedFriendRequests,
    sentFriendRequests,
    isReceivedFriendRequestLoading,
    isReceivedFriendRequestError,
    isSentFriendRequestLoading,
    isSentFriendRequestError,
    processingFriendRequestId,
    processingFriendRequestAction,
    onAcceptFriendRequest,
    onRejectFriendRequest,
    onCancelFriendRequest,
}: NotificationCenterContentProps) {
    const t = useTranslations("Notifications");

    if (activeTab === "NOTICE") {
        return (
            <NotificationEmptyState
                title={t("notice.emptyTitle")}
                description={t("notice.emptyDescription")}
            />
        );
    }

    if (activeTab === "PERSONAL") {
        return (
            <NotificationEmptyState
                title={t("personal.emptyTitle")}
                description={t("personal.emptyDescription")}
            />
        );
    }

    return (
        <NotificationInvitationPanel
            accountBookInvitations={accountBookInvitations}
            isAccountBookInvitationLoading={isAccountBookInvitationLoading}
            isAccountBookInvitationError={isAccountBookInvitationError}
            processingAccountBookInvitationId={
                processingAccountBookInvitationId
            }
            onAcceptAccountBookInvitation={onAcceptAccountBookInvitation}
            onRejectAccountBookInvitation={onRejectAccountBookInvitation}
            receivedFriendRequests={receivedFriendRequests}
            sentFriendRequests={sentFriendRequests}
            isReceivedFriendRequestLoading={
                isReceivedFriendRequestLoading
            }
            isReceivedFriendRequestError={isReceivedFriendRequestError}
            isSentFriendRequestLoading={isSentFriendRequestLoading}
            isSentFriendRequestError={isSentFriendRequestError}
            processingFriendRequestId={processingFriendRequestId}
            processingFriendRequestAction={processingFriendRequestAction}
            onAcceptFriendRequest={onAcceptFriendRequest}
            onRejectFriendRequest={onRejectFriendRequest}
            onCancelFriendRequest={onCancelFriendRequest}
        />
    );
}
