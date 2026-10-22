"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { useQuery } from "@/hooks/useQuery";
import { openChatInvitationService } from "@/services/chat/openChatInvitationService";
import {
    OPEN_CHAT_INVITATION_CHANGED,
} from "@/utils/chat/openChatInvitation";

export function useOpenChatInvitationSummary() {
    const { data: session } = useSession();
    const loginSessionId = session?.loginSessionId ?? null;
    const accountKey = loginSessionId
        ? `${loginSessionId}:${session?.user?.email?.trim().toLowerCase() ?? ""}`
        : null;

    const query = useQuery({
        keys: ["open-chat-invitation-summary", accountKey] as const,
        fetcher: () => {
            if (loginSessionId === null) {
                throw new Error("OPEN invitation summary requires a login session.");
            }
            return openChatInvitationService.summary(loginSessionId);
        },
        enabled: accountKey !== null,
        config: {
            revalidateOnMount: true,
            revalidateOnFocus: true,
            refreshInterval: 30000,
            refreshWhenHidden: false,
            refreshWhenOffline: false,
            shouldRetryOnError: false,
        },
    });
    const { mutate } = query;

    useEffect(() => {
        if (accountKey === null) {
            return;
        }

        // WebSocket 알림과 수신함 읽음 변경 후 서버 값으로 다시 수렴한다.
        const refresh = () => {
            void mutate((current) => current, true);
        };

        window.addEventListener(OPEN_CHAT_INVITATION_CHANGED, refresh);
        return () => {
            window.removeEventListener(OPEN_CHAT_INVITATION_CHANGED, refresh);
        };
    }, [accountKey, mutate]);

    return {
        unreadCount: query.data?.unreadCount ?? 0,
        isLoading: query.isLoading,
        isError: Boolean(query.isError),
    };
}
