import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    ChatAiSystemSetting,
    ChatAiSystemSettingUpdateRequest,
} from "@/types/chat";

export const adminChatAiSettingService = {
    getSettings: async (): Promise<ChatAiSystemSetting> => {
        const response = await apiClient("/admin/chat/ai-settings", {
            method: "GET",
        });

        return parseResponseBody<ChatAiSystemSetting>(
            response,
            "AdminChatAiSetting",
        );
    },

    updateSettings: async (
        request: ChatAiSystemSettingUpdateRequest,
    ): Promise<ChatAiSystemSetting> => {
        const response = await apiClient("/admin/chat/ai-settings", {
            method: "PATCH",
            body: JSON.stringify(request),
        });

        return parseResponseBody<ChatAiSystemSetting>(
            response,
            "AdminChatAiSettingUpdate",
        );
    },
};
