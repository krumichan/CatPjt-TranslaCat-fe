"use client";

import { useTranslations } from "next-intl";

import FriendRequestNotificationItem from "@/components/notification/FriendRequestNotificationItem";
import type { FriendRequestAction } from "@/components/notification/useNotificationCenter";
import type { FriendRequest } from "@/types/social";

type FriendRequestNotificationListProps = {
    receivedRequests: FriendRequest[];
    sentRequests: FriendRequest[];
    isReceivedLoading: boolean;
    isReceivedError: unknown;
    isSentLoading: boolean;
    isSentError: unknown;
    processingRequestId: number | null;
    processingAction: FriendRequestAction | null;
    onAccept: (requestId: number) => void;
    onReject: (requestId: number) => void;
    onCancel: (requestId: number) => void;
};

export default function FriendRequestNotificationList({
    receivedRequests,
    sentRequests,
    isReceivedLoading,
    isReceivedError,
    isSentLoading,
    isSentError,
    processingRequestId,
    processingAction,
    onAccept,
    onReject,
    onCancel,
}: FriendRequestNotificationListProps) {
    const t = useTranslations("Notifications");

    return (
        <div className="space-y-4">
            <FriendRequestGroup
                title={t("friendRequest.receivedSectionTitle")}
                emptyText={t("friendRequest.receivedEmpty")}
                isLoading={isReceivedLoading}
                isError={isReceivedError}
                requests={receivedRequests}
                direction="RECEIVED"
                processingRequestId={processingRequestId}
                processingAction={processingAction}
                onAccept={onAccept}
                onReject={onReject}
                onCancel={onCancel}
            />

            <FriendRequestGroup
                title={t("friendRequest.sentSectionTitle")}
                emptyText={t("friendRequest.sentEmpty")}
                isLoading={isSentLoading}
                isError={isSentError}
                requests={sentRequests}
                direction="SENT"
                processingRequestId={processingRequestId}
                processingAction={processingAction}
                onAccept={onAccept}
                onReject={onReject}
                onCancel={onCancel}
            />
        </div>
    );
}

type FriendRequestDirection = "RECEIVED" | "SENT";

type FriendRequestGroupProps = {
    title: string;
    emptyText: string;
    isLoading: boolean;
    isError: unknown;
    requests: FriendRequest[];
    direction: FriendRequestDirection;
    processingRequestId: number | null;
    processingAction: FriendRequestAction | null;
    onAccept: (requestId: number) => void;
    onReject: (requestId: number) => void;
    onCancel: (requestId: number) => void;
};

function FriendRequestGroup({
    title,
    emptyText,
    isLoading,
    isError,
    requests,
    direction,
    processingRequestId,
    processingAction,
    onAccept,
    onReject,
    onCancel,
}: FriendRequestGroupProps) {
    const t = useTranslations("Notifications");

    if (isLoading && requests.length === 0) {
        return (
            <div>
                <h4 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    {title}
                </h4>
                <div className="rounded-2xl bg-black/20 px-4 py-5 text-center text-sm font-bold text-slate-400">
                    {t("messages.loading")}
                </div>
            </div>
        );
    }

    if (isError && requests.length === 0) {
        return (
            <div>
                <h4 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    {title}
                </h4>
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-5 text-center text-sm font-bold text-rose-200">
                    {t("messages.loadFailed")}
                </div>
            </div>
        );
    }

    return (
        <div>
            <h4 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                {title}
            </h4>

            {requests.length === 0 ? (
                <div className="rounded-2xl bg-black/20 px-4 py-5 text-center text-sm text-slate-400">
                    {emptyText}
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map((request) => (
                        <FriendRequestNotificationItem
                            key={request.id}
                            request={request}
                            direction={direction}
                            isProcessing={
                                processingRequestId === request.id
                            }
                            isBusy={processingRequestId !== null}
                            processingAction={processingAction}
                            onAccept={onAccept}
                            onReject={onReject}
                            onCancel={onCancel}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
