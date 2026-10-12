"use client";

import { useSession } from "next-auth/react";

import { UrgentNoticeSmartModal } from "@/components/support/UrgentNoticeSmartModal";
import { isTerminalAuthError } from "@/lib/authError";

export function UrgentNoticeGate() {
    const { data: session, status } = useSession();
    const owner = session?.user.publicId ?? session?.user.email;
    const loginSessionId = session?.loginSessionId;

    // 로그인 경계에서 하위 상태를 새로 만들어 이전 계정의 늦은 응답과 모달을 분리한다.
    if (status !== "authenticated" || !owner || !loginSessionId || isTerminalAuthError(session?.error)) {
        return null;
    }

    return (
        <UrgentNoticeSmartModal
            key={JSON.stringify([owner, loginSessionId])}
            owner={owner}
            loginSessionId={loginSessionId}
        />
    );
}
