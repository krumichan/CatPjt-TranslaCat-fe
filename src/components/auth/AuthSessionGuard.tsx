"use client";

import {
    useCallback,
    useEffect,
    useRef,
} from "react";
import {
    signOut,
    useSession,
} from "next-auth/react";

import { AUTH_UNAUTHORIZED_EVENT } from "@/lib/authEvents";
import { usePathname } from "next/navigation";
import { stripLocalePrefix } from "@/lib/authPolicy";
import { locales } from "@/i18n/config";
import {
    isTemporaryAuthError,
    isTerminalAuthError,
} from "@/lib/authError";

interface AuthSessionGuardProps {
    children: React.ReactNode;
}

export default function AuthSessionGuard({
    children,
}: AuthSessionGuardProps) {
    const keepDeletionReceipt = stripLocalePrefix(usePathname(), locales) === "/account-deletion";
    const {
        data: session,
        update,
    } = useSession();
    const signOutStartedRef = useRef(false);

    const signOutOnce = useCallback(() => {
        if (signOutStartedRef.current) {
            return;
        }

        signOutStartedRef.current = true;

        void signOut({
            callbackUrl: "/login",
            // 탈퇴로 서버 세션이 폐기돼도 공개 영수증 화면은 유지해 처리 상태를 확인하게 한다.
            redirect: !keepDeletionReceipt,
        }).catch(() => {
            signOutStartedRef.current = false;
        });
    }, [keepDeletionReceipt]);

    useEffect(() => {
        const handleUnauthorized = () => {
            signOutOnce();
        };

        window.addEventListener(
            AUTH_UNAUTHORIZED_EVENT,
            handleUnauthorized,
        );

        return () => {
            window.removeEventListener(
                AUTH_UNAUTHORIZED_EVENT,
                handleUnauthorized,
            );
        };
    }, [signOutOnce]);

    useEffect(() => {
        if (isTerminalAuthError(session?.error)) {
            signOutOnce();
        }
    }, [session?.error, signOutOnce]);

    useEffect(() => {
        if (!isTemporaryAuthError(session?.error)) {
            return;
        }

        const retryAt = session?.refreshRetryAt ?? Date.now();
        const delay = Math.max(retryAt - Date.now(), 0);

        const timeoutId = window.setTimeout(() => {
            void update();
        }, delay + 50);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [session?.error, session?.refreshRetryAt, update]);

    return children;
}
