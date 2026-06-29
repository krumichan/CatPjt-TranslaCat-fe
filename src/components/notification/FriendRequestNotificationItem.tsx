"use client";

import { Check, UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";

import type { FriendRequestAction } from "@/components/notification/useNotificationCenter";
import type { FriendRequest, UserSummaryProfile } from "@/types/social";

type FriendRequestDirection = "RECEIVED" | "SENT";

type FriendRequestNotificationItemProps = {
    request: FriendRequest;
    direction: FriendRequestDirection;
    isProcessing: boolean;
    isBusy: boolean;
    processingAction: FriendRequestAction | null;
    onAccept: (requestId: number) => void;
    onReject: (requestId: number) => void;
    onCancel: (requestId: number) => void;
};

function getRequesterProfile(request: FriendRequest): UserSummaryProfile {
    return (
        request.requester ?? {
            userId: request.requesterUserId,
            publicId: request.requesterPublicId ?? "-",
            nickname:
                request.requesterNickname ??
                request.requesterPublicId ??
                "-",
            profileImageUrl: request.requesterProfileImageUrl ?? null,
        }
    );
}

function getReceiverProfile(request: FriendRequest): UserSummaryProfile {
    return (
        request.receiver ?? {
            userId: request.receiverUserId,
            publicId: request.receiverPublicId ?? "-",
            nickname:
                request.receiverNickname ??
                request.receiverPublicId ??
                "-",
            profileImageUrl: request.receiverProfileImageUrl ?? null,
        }
    );
}

export default function FriendRequestNotificationItem({
    request,
    direction,
    isProcessing,
    isBusy,
    processingAction,
    onAccept,
    onReject,
    onCancel,
}: FriendRequestNotificationItemProps) {
    const t = useTranslations("Notifications");
    const profile =
        direction === "RECEIVED"
            ? getRequesterProfile(request)
            : getReceiverProfile(request);

    const isReceived = direction === "RECEIVED";

    return (
        <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-500/10 text-orange-200">
                        {profile.profileImageUrl ? (
                            // TODO: TranslaCat 이미지 업로드 방식 전환 시 next/image 적용 검토
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={profile.profileImageUrl}
                                alt={profile.nickname}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <UserRound
                                className="h-6 w-6"
                                aria-hidden="true"
                            />
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="text-sm font-black text-white">
                            {isReceived
                                ? t("friendRequest.receivedTitle")
                                : t("friendRequest.sentTitle")}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-300">
                            {isReceived
                                ? t("friendRequest.receivedDescription", {
                                      requesterName: profile.nickname,
                                  })
                                : t("friendRequest.sentDescription", {
                                      receiverName: profile.nickname,
                                  })}
                        </p>
                        <code className="mt-2 inline-flex max-w-full rounded-lg bg-white/10 px-2 py-1 text-xs font-bold text-slate-300">
                            <span className="truncate">
                                {profile.publicId}
                            </span>
                        </code>
                    </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    {isReceived ? (
                        <>
                            <button
                                type="button"
                                onClick={() => onReject(request.id)}
                                disabled={isBusy}
                                className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                                {isProcessing &&
                                processingAction === "REJECT"
                                    ? t("actions.processing")
                                    : t("actions.reject")}
                            </button>

                            <button
                                type="button"
                                onClick={() => onAccept(request.id)}
                                disabled={isBusy}
                                className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-700"
                            >
                                <Check
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                                {isProcessing &&
                                processingAction === "ACCEPT"
                                    ? t("actions.processing")
                                    : t("actions.accept")}
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onCancel(request.id)}
                            disabled={isBusy}
                            className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                            {isProcessing && processingAction === "CANCEL"
                                ? t("actions.processing")
                                : t("actions.cancel")}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}
