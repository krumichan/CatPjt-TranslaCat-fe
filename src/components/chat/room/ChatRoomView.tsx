"use client";

import { ChatMessageInput } from "@/components/chat/room/ChatMessageInput";
import { ChatMessageList } from "@/components/chat/room/ChatMessageList";
import { ChatRoomHeader } from "@/components/chat/room/ChatRoomHeader";
import type { ChatRoomPageController } from "@/hooks/chat/useChatRoomPageController";
import type { ChatRoom } from "@/types/chat";

interface ChatRoomViewProps {
    room: ChatRoom;
    controller: ChatRoomPageController;
}

export function ChatRoomView({
    room,
    controller,
}: ChatRoomViewProps) {
    const {
        chatRoom,
        languageSettings,
        roomMenu,
        openLifecycle,
        openChat,
        realtime,
    } = controller;

    return (
        <div
            data-testid="chat-room-shell"
            className="fixed inset-x-0 bottom-0 top-15 flex min-h-0 flex-col overflow-hidden bg-slate-100 dark:bg-slate-950"
        >
            <div className="shrink-0">
                <ChatRoomHeader
                    room={room}
                    connectionStatus={realtime.connectionStatus}
                    languageSettings={languageSettings.settings}
                    isLanguageSettingsLoading={
                        languageSettings.isLoading
                    }
                    languageSettingsLoadErrorCode={
                        languageSettings.loadErrorCode
                    }
                    onOpenLanguageSettings={
                        controller.openLanguageSettings
                    }
                    onOpenPartnerProfile={
                        controller.canOpenPartnerProfile
                            ? controller.openPartnerProfile
                            : undefined
                    }
                    onOpenRoomMenu={roomMenu.openMenu}
                />
            </div>

            <div
                data-testid="chat-message-viewport"
                className="flex min-h-0 flex-1 overflow-hidden"
            >
                <ChatMessageList
                    messages={chatRoom.messages}
                    currentUserEmail={controller.currentUserEmail}
                    currentOpenChatMemberId={
                        openChat.myProfile.profile?.openChatMemberId ?? null
                    }
                    roomType={controller.roomType}
                    aiDisclosureType={
                        controller.aiDisplayPolicy.setting?.disclosureType ?? null
                    }
                    languageSettings={languageSettings.settings}
                    hasNext={chatRoom.hasNext}
                    isLoadingMore={chatRoom.isLoadingMore}
                    loadMoreErrorMessage={
                        controller.loadMoreErrorMessage
                    }
                    retryingTranslationKeys={
                        chatRoom.retryingTranslationKeys
                    }
                    retryTranslationErrorKeys={
                        chatRoom.retryTranslationErrorKeys
                    }
                    onOpenAiSenderProfile={
                        controller.openAiMessageSenderProfile
                    }
                    onOpenSenderProfile={
                        controller.canOpenMessageSenderProfile
                            ? controller.openMessageSenderProfile
                            : undefined
                    }
                    onLoadMore={chatRoom.loadMoreMessages}
                    onRetryTranslation={chatRoom.retryTranslation}
                    onRefreshMessages={chatRoom.syncLatestMessages}
                />
            </div>

            <div className="shrink-0">
                <ChatMessageInput
                    onSend={realtime.sendMessage}
                    isSending={realtime.isSending}
                    disabled={
                        openLifecycle.isRoomClosed || openChat.isBanned
                    }
                    sendErrorMessage={controller.sendErrorMessage}
                />
            </div>
        </div>
    );
}
