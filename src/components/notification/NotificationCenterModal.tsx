import { createPortal } from "react-dom";
import { useEffect } from "react";

import NotificationCenterContent from "@/components/notification/NotificationCenterContent";
import NotificationCenterHeader from "@/components/notification/NotificationCenterHeader";
import { useNotificationCenter } from "@/components/notification/useNotificationCenter";

type NotificationCenterModalProps = {
    isOpen: boolean;
    notification: ReturnType<typeof useNotificationCenter>;
    onClose: () => void;
};

export default function NotificationCenterModal({
    isOpen,
    notification,
    onClose,
}: NotificationCenterModalProps) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-1200 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm dark:bg-black/60"
            role="presentation"
            onClick={onClose}
        >
            <section
                role="dialog"
                aria-modal="true"
                className="max-h-[min(760px,calc(100vh-48px))] w-full max-w-3xl overflow-hidden rounded-4xl border border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-white"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
            >
                <NotificationCenterHeader
                    activeTab={notification.activeTab}
                    tabCounts={notification.tabCounts}
                    onTabChange={notification.setActiveTab}
                    onClose={onClose}
                />

                <div className="max-h-[calc(100vh-260px)] overflow-y-auto border-t border-slate-200 p-5 dark:border-white/10">
                    <NotificationCenterContent
                        activeTab={notification.activeTab}
                        chatNotificationItems={notification.chatNotificationItems}
                        isChatNotificationLoading={notification.isChatNotificationLoading}
                        isChatNotificationError={notification.isChatNotificationError}
                        processingChatRoomId={notification.processingChatRoomId}
                        onMarkChatAsRead={notification.handleMarkChatAsRead}
                        onNavigateChat={onClose}
                        chatActivityItems={notification.chatActivityItems}
                        isChatActivityLoading={notification.isChatActivityLoading}
                        isChatActivityError={notification.isChatActivityError}
                        accountBookInvitations={
                            notification.accountBookInvitations
                        }
                        isAccountBookInvitationLoading={
                            notification.isAccountBookInvitationLoading
                        }
                        isAccountBookInvitationError={
                            notification.isAccountBookInvitationError
                        }
                        processingAccountBookInvitationId={
                            notification.processingAccountBookInvitationId
                        }
                        onAcceptAccountBookInvitation={
                            notification.handleAcceptInvitation
                        }
                        onRejectAccountBookInvitation={
                            notification.handleRejectInvitation
                        }
                        receivedFriendRequests={
                            notification.receivedFriendRequests
                        }
                        sentFriendRequests={notification.sentFriendRequests}
                        isReceivedFriendRequestLoading={
                            notification.isReceivedFriendRequestLoading
                        }
                        isReceivedFriendRequestError={
                            notification.isReceivedFriendRequestError
                        }
                        isSentFriendRequestLoading={
                            notification.isSentFriendRequestLoading
                        }
                        isSentFriendRequestError={
                            notification.isSentFriendRequestError
                        }
                        processingFriendRequestId={
                            notification.processingFriendRequestId
                        }
                        processingFriendRequestAction={
                            notification.processingFriendRequestAction
                        }
                        onAcceptFriendRequest={
                            notification.handleAcceptFriendRequest
                        }
                        onRejectFriendRequest={
                            notification.handleRejectFriendRequest
                        }
                        onCancelFriendRequest={
                            notification.handleCancelFriendRequest
                        }
                    />
                </div>
            </section>
        </div>,
        document.body,
    );
}
