"use client";

import {
    AlertCircle,
    Loader2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { ChatMessageInput } from "@/components/chat/room/ChatMessageInput";
import { ChatMessageList } from "@/components/chat/room/ChatMessageList";
import { ChatRoomHeader } from "@/components/chat/room/ChatRoomHeader";
import { ChatLanguageSettingsModal } from "@/components/chat/room/modal/ChatLanguageSettingsModal";
import { ChatMemberProfilePreviewModal } from "@/components/chat/room/modal/ChatMemberProfilePreviewModal";
import { ChatPartnerProfilePreviewModal } from "@/components/chat/room/modal/ChatPartnerProfilePreviewModal";
import { useChatLanguageSettings } from "@/hooks/chat/useChatLanguageSettings";
import { useChatMemberProfilePreview } from "@/hooks/chat/useChatMemberProfilePreview";
import { useChatPartnerProfilePreview } from "@/hooks/chat/useChatPartnerProfilePreview";
import { useChatRoom } from "@/hooks/chat/useChatRoom";
import { useChatRoomRealtime } from "@/hooks/chat/useChatRoomRealtime";

interface ChatRoomPageProps {
    roomId: number;
}

export function ChatRoomPage({
    roomId,
}: ChatRoomPageProps) {
    const t = useTranslations("ChatRoom");
    const { data: session } = useSession();

    const [
        isLanguageSettingsOpen,
        setIsLanguageSettingsOpen,
    ] = useState(false);

    const partnerProfilePreview =
        useChatPartnerProfilePreview();

    const memberProfilePreview =
        useChatMemberProfilePreview({
            roomId,
        });

    const {
        room,
        messages,
        isLoading,
        isSending: isRestSending,
        isLoadingMore,
        hasNext,
        loadErrorCode,
        sendErrorCode: restSendErrorCode,
        loadMoreErrorCode,
        retryingTranslationKeys,
        retryTranslationErrorKeys,
        reload,
        loadMoreMessages,
        sendMessage: sendRestMessage,
        appendMessage,
        applyTranslationCompleted,
        syncLatestMessages,
        retryTranslation,
    } = useChatRoom(roomId);

    const {
        settings: languageSettings,
        defaultSettings,
        resolvedSource: languageSettingsSource,
        isLoading: isLanguageSettingsLoading,
        isSaving: isLanguageSettingsSaving,
        loadErrorCode: languageSettingsLoadErrorCode,
        saveErrorCode: languageSettingsSaveErrorCode,
        reload: reloadLanguageSettings,
        saveSettings: saveLanguageSettings,
    } = useChatLanguageSettings(roomId);

    const accessToken =
        session?.accessToken ?? null;
    const currentUserEmail =
        session?.user?.email ?? null;

    const realtime = useChatRoomRealtime({
        roomId,
        accessToken,
        isRestSending,
        restSendErrorCode,
        appendMessage,
        applyTranslationCompleted,
        syncLatestMessages,
        sendRestMessage,
    });

    const sendErrorMessage =
        realtime.sendErrorCode
            ? t("input.sendFailed")
            : null;

    const loadMoreErrorMessage =
        loadMoreErrorCode
            ? t("pagination.loadFailed")
            : null;

    const directPartner =
        room?.directPartner ?? null;
    const roomType =
        room?.roomType ?? null;
    const roomSourceType =
        room?.sourceType ?? null;

    const canOpenPartnerProfile =
        roomType === "DIRECT" &&
        roomSourceType === "FRIEND" &&
        directPartner !== null;

    const {
        openProfilePreview:
            openPartnerProfilePreview,
    } = partnerProfilePreview;

    const {
        openProfile:
            openMemberProfilePreview,
    } = memberProfilePreview;

    const openPartnerProfile = useCallback(() => {
        if (!directPartner) {
            return;
        }

        openPartnerProfilePreview(
            directPartner,
        );
    }, [
        directPartner,
        openPartnerProfilePreview,
    ]);

    const openMessageSenderProfile = useCallback(
        (senderUserId: number) => {
            if (roomType === "GROUP") {
                void openMemberProfilePreview(
                    senderUserId,
                );
                return;
            }

            if (
                canOpenPartnerProfile &&
                directPartner?.userId ===
                    senderUserId
            ) {
                openPartnerProfilePreview(
                    directPartner,
                );
            }
        },
        [
            canOpenPartnerProfile,
            directPartner,
            openMemberProfilePreview,
            openPartnerProfilePreview,
            roomType,
        ],
    );

    const canOpenMessageSenderProfile =
        roomType === "GROUP" ||
        canOpenPartnerProfile;

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-slate-500 dark:text-slate-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t("loading")}
            </div>
        );
    }

    if (loadErrorCode || !room) {
        return (
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-center justify-center px-4 text-center">
                <AlertCircle className="h-10 w-10 text-red-500" />

                <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t("error.title")}
                </h1>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {loadErrorCode
                        ? t("error.loadFailed")
                        : t("error.notFound")}
                </p>

                <button
                    type="button"
                    onClick={() => void reload()}
                    className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                    {t("error.retry")}
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="fixed inset-x-0 bottom-0 top-17 flex min-h-0 flex-col overflow-hidden bg-slate-950">
                <div className="shrink-0">
                    <ChatRoomHeader
                        room={room}
                        connectionStatus={
                            realtime.connectionStatus
                        }
                        languageSettings={
                            languageSettings
                        }
                        isLanguageSettingsLoading={
                            isLanguageSettingsLoading
                        }
                        languageSettingsLoadErrorCode={
                            languageSettingsLoadErrorCode
                        }
                        onOpenLanguageSettings={() =>
                            setIsLanguageSettingsOpen(
                                true,
                            )
                        }
                        onOpenPartnerProfile={
                            canOpenPartnerProfile
                                ? openPartnerProfile
                                : undefined
                        }
                    />
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                    <ChatMessageList
                        messages={messages}
                        currentUserEmail={
                            currentUserEmail
                        }
                        languageSettings={
                            languageSettings
                        }
                        hasNext={hasNext}
                        isLoadingMore={isLoadingMore}
                        loadMoreErrorMessage={
                            loadMoreErrorMessage
                        }
                        retryingTranslationKeys={
                            retryingTranslationKeys
                        }
                        retryTranslationErrorKeys={
                            retryTranslationErrorKeys
                        }
                        onOpenSenderProfile={
                            canOpenMessageSenderProfile
                                ? openMessageSenderProfile
                                : undefined
                        }
                        onLoadMore={
                            loadMoreMessages
                        }
                        onRetryTranslation={
                            retryTranslation
                        }
                        onRefreshMessages={
                            syncLatestMessages
                        }
                    />
                </div>

                <div className="shrink-0">
                    <ChatMessageInput
                        onSend={realtime.sendMessage}
                        isSending={
                            realtime.isSending
                        }
                        sendErrorMessage={
                            sendErrorMessage
                        }
                    />
                </div>
            </div>

            <ChatLanguageSettingsModal
                isOpen={isLanguageSettingsOpen}
                settings={languageSettings}
                defaultSettings={defaultSettings}
                resolvedSource={
                    languageSettingsSource
                }
                isLoading={
                    isLanguageSettingsLoading
                }
                isSaving={
                    isLanguageSettingsSaving
                }
                loadErrorCode={
                    languageSettingsLoadErrorCode
                }
                saveErrorCode={
                    languageSettingsSaveErrorCode
                }
                onClose={() =>
                    setIsLanguageSettingsOpen(false)
                }
                onSave={saveLanguageSettings}
                onReload={reloadLanguageSettings}
            />

            <ChatPartnerProfilePreviewModal
                isOpen={
                    partnerProfilePreview.isProfilePreviewOpen
                }
                partner={
                    partnerProfilePreview.previewPartner
                }
                onClose={
                    partnerProfilePreview.closeProfilePreview
                }
            />

            <ChatMemberProfilePreviewModal
                isOpen={memberProfilePreview.isOpen}
                profile={memberProfilePreview.profile}
                isLoading={memberProfilePreview.isLoading}
                isSendingFriendRequest={
                    memberProfilePreview.isSendingFriendRequest
                }
                loadErrorCode={
                    memberProfilePreview.loadErrorCode
                }
                friendRequestErrorCode={
                    memberProfilePreview.friendRequestErrorCode
                }
                onRetry={
                    memberProfilePreview.retryProfile
                }
                onSendFriendRequest={
                    memberProfilePreview.sendFriendRequest
                }
                onClose={
                    memberProfilePreview.closeProfile
                }
            />
        </>
    );
}
