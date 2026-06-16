import { createPortal } from "react-dom";
import { useEffect } from "react";

import { useNotificationCenter } from "@/components/notification/useNotificationCenter";
import NotificationCenterHeader from "@/components/notification/NotificationCenterHeader";
import NotificationCenterContent from "@/components/notification/NotificationCenterContent";

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
        <>
            <div
                className="fixed inset-0 z-120 bg-black/50 backdrop-blur-sm"
                onMouseDown={onClose}
            />

            <div className="fixed inset-0 z-[121] flex items-center justify-center px-3 py-4 sm:px-6">
                <section
                    className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                >
                    <NotificationCenterHeader
                        activeTab={notification.activeTab}
                        onTabChange={notification.setActiveTab}
                        onClose={onClose}
                    />

                    <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                        <NotificationCenterContent
                            activeTab={notification.activeTab}
                            invitations={notification.invitations}
                            isInvitationLoading={
                                notification.isInvitationLoading
                            }
                            isInvitationError={
                                notification.isInvitationError
                            }
                            processingInvitationId={
                                notification.processingInvitationId
                            }
                            onAcceptInvitation={
                                notification.handleAcceptInvitation
                            }
                            onRejectInvitation={
                                notification.handleRejectInvitation
                            }
                        />
                    </div>
                </section>
            </div>
        </>,
        document.body,
    );
}