"use client";

import { useEffect, useState } from "react";

import { IdentityError, identityErrorCode, identityRequest } from "@/services/identityClient";
import type { EmailChallenge, EmailVerification } from "@/types/auth";

export function useEmailVerification(email: string, account = false) {
    const [challenge, setChallenge] = useState<EmailChallenge | null>(null);
    const [code, setCode] = useState("");
    const [proof, setProof] = useState<EmailVerification | null>(null);
    const [resendAt, setResendAt] = useState(0);
    const [expiresAt, setExpiresAt] = useState(0);
    const [now, setNow] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const reset = () => {
        setChallenge(null);
        setProof(null);
        setCode("");
        setError(null);
        setResendAt(0);
        setExpiresAt(0);
    };

    const send = async () => {
        setBusy(true);
        setError(null);
        try {
            // 재전송은 이전 코드와 proof를 대체한다. 민감한 값은 컴포넌트 메모리에만 둔다.
            const result = await identityRequest<EmailChallenge>(account ? "/api/account/email/challenges" : "/api/auth/public/email/challenges", account ? {} : { email: email.trim() });
            const time = Date.now();
            setNow(time);
            setChallenge(result);
            setCode("");
            setProof(null);
            setExpiresAt(time + result.expiresIn * 1000);
            setResendAt(time + result.resendAfterSeconds * 1000);
        } catch (error) {
            setError(identityErrorCode(error));
            if (error instanceof IdentityError && error.retryAfterSeconds) setResendAt(Date.now() + error.retryAfterSeconds * 1000);
        } finally {
            setBusy(false);
        }
    };

    const verify = async () => {
        if (!challenge) return;
        setBusy(true);
        setError(null);
        try {
            // 코드 인증과 회원가입의 유효시간을 분리하고 서버의 만료시간을 따른다.
            const result = await identityRequest<EmailVerification>("/api/auth/public/email/verify", { challengeId: challenge.challengeId, code });
            setProof(result);
            setCode("");
            setExpiresAt(Date.now() + result.expiresIn * 1000);
        } catch (error) {
            setError(identityErrorCode(error));
        } finally {
            setBusy(false);
        }
    };

    return {
        challenge, code, setCode, busy, error, send, verify, reset,
        verified: !!proof && expiresAt > now,
        verificationToken: proof && expiresAt > now ? proof.verificationToken : null,
        expired: !!challenge && expiresAt <= now,
        remaining: Math.max(0, Math.ceil((expiresAt - now) / 1000)),
        resendIn: Math.max(0, Math.ceil((resendAt - now) / 1000)),
    };
}
