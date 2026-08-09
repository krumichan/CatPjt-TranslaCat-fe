"use client";

import { ChatAiSystemSettingsForm } from "@/components/settings/admin/chat-ai/ChatAiSystemSettingsForm";
import { useChatAiSystemSettingsForm } from "@/components/settings/admin/chat-ai/useChatAiSystemSettingsForm";

export function ChatAiSystemSettingsSmartForm() {
    const controller = useChatAiSystemSettingsForm();

    return <ChatAiSystemSettingsForm controller={controller} />;
}
