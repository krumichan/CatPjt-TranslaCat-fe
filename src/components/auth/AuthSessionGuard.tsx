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
        }).catch(() => {
            signOutStartedRef.current = false;
        });
    }, []);

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

        const retryAt = session.refreshRetryAt ?? Date.now();
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
