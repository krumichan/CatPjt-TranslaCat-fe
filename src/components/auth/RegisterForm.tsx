"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
    AuthErrorMessage,
    AuthField,
    PasswordFields,
    authButtonClass,
} from "@/components/auth/AuthFormParts";
import EmailVerificationFields from "@/components/auth/EmailVerificationFields";
import { useEmailVerification } from "@/hooks/auth/useEmailVerification";
import { validBirthDate, validPassword } from "@/lib/authPolicy";
import { identityErrorCode, identityRequest } from "@/services/identityClient";
import { Link, useRouter } from "@/navigation";

export default function RegisterForm() {
    const t = useTranslations("Auth");
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [nickname, setNickname] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const verification = useEmailVerification(email);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        // 서버 정책과 같은 입력 검사를 통과한 인증 proof만 가입 요청에 사용한다.
        if (!verification.verificationToken) {
            return setError("EMAIL_VERIFICATION_REQUIRED");
        }
        if (!validPassword(password)) return setError("AUTH_PASSWORD_INVALID");
        if (password !== confirmation) return setError("PASSWORD_MISMATCH");
        if (!nickname.trim() || nickname.trim().length > 30) {
            return setError("AUTH_NICKNAME_INVALID");
        }
        if (!validBirthDate(birthDate)) return setError("AUTH_BIRTH_DATE_INVALID");

        setBusy(true);
        try {
            // 이메일 인증 증명과 가입 정보를 서버에 함께 제출한다.
            await identityRequest("/api/auth/public/register", {
                email: email.trim(),
                password,
                nickname: nickname.trim(),
                birthDate,
                verificationToken: verification.verificationToken,
            });

            // 가입 완료 시 민감한 입력을 지우고 기존 로그인 세션 흐름으로 돌아간다.
            setPassword("");
            setConfirmation("");
            verification.reset();
            router.replace("/login?registered=1");
        } catch (error) {
            const code = identityErrorCode(error);
            setError(code);
            // 다른 탭에서 소비했거나 서버에서 만료된 proof는 즉시 다시 인증할 수 있게 한다.
            if (
                code === "AUTH_EMAIL_VERIFICATION_INVALID" ||
                code === "AUTH_EMAIL_VERIFICATION_EXPIRED"
            ) {
                verification.reset();
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <AuthField
                id="register-email"
                label={t("email")}
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => {
                    setEmail(e.target.value);
                    verification.reset();
                    setError(null);
                }}
                disabled={busy || verification.busy}
            />
            <EmailVerificationFields
                verification={verification}
                canSend={/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
                disabled={busy}
            />
            {verification.verified && (
                <div className="space-y-4">
                    <PasswordFields
                        password={password}
                        confirmation={confirmation}
                        onPassword={setPassword}
                        onConfirmation={setConfirmation}
                        disabled={busy}
                    />
                    <AuthField
                        id="register-nickname"
                        label={t("nickname")}
                        hint={t("nicknameHint")}
                        type="text"
                        autoComplete="nickname"
                        required
                        maxLength={30}
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        disabled={busy}
                    />
                    <AuthField
                        id="register-birth-date"
                        label={t("birthDate")}
                        hint={t("birthDateHint")}
                        type="date"
                        autoComplete="bday"
                        required
                        max={new Date().toISOString().slice(0, 10)}
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        disabled={busy}
                    />
                </div>
            )}
            <AuthErrorMessage code={error} />
            <button
                type="submit"
                className={`${authButtonClass} w-full`}
                disabled={busy || !verification.verified}
            >
                {busy ? t("working") : t("createAccount")}
            </button>
            <p className="text-center text-sm text-slate-500">
                {t("hasAccount")}{" "}
                <Link
                    href="/login"
                    className="font-bold text-blue-600 hover:underline dark:text-blue-400"
                >
                    {t("login")}
                </Link>
            </p>
        </form>
    );
}
