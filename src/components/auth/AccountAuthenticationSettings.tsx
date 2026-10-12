"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, Mail } from "lucide-react";

import {
    AuthErrorMessage,
    AuthField,
    PasswordFields,
    authButtonClass,
    authSecondaryClass,
} from "@/components/auth/AuthFormParts";
import EmailVerificationFields from "@/components/auth/EmailVerificationFields";
import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";
import { useEmailVerification } from "@/hooks/auth/useEmailVerification";
import { validPassword } from "@/lib/authPolicy";
import { identityErrorCode, identityRequest } from "@/services/identityClient";
import type { AccountAuthentication, GoogleAccountPurpose } from "@/types/auth";

const cardClass = "space-y-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900";

export default function AccountAuthenticationSettings() {
    const t = useTranslations("Auth");
    const locale = useLocale();
    const query = useSearchParams();
    const [account, setAccount] = useState<AccountAuthentication | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const verification = useEmailVerification(account?.email ?? "", true);
    const googleResult = query.get("google");
    const googleError = googleResult && !["linked", "reauthenticated"].includes(googleResult)
        ? googleResult
        : null;

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            // 비밀번호 입력 허용 여부는 URL이 아닌 서버의 재인증 상태로 판단한다.
            setAccount(await identityRequest<AccountAuthentication>("/api/account/details"));
        } catch (error) {
            setError(identityErrorCode(error));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    const startGoogle = async (purpose: GoogleAccountPurpose) => {
        setBusy(true);
        setError(null);
        try {
            // 서버 쿠키에 인증 시도를 저장한 다음 기존 Google OAuth callback으로 이어간다.
            await identityRequest("/api/account/google/start", {
                purpose,
                currentPassword: purpose === "LINK" ? currentPassword : undefined,
                locale,
            });
            setCurrentPassword("");
            await signIn("google", { callbackUrl: `/${locale}/settings/account` });
        } catch (error) {
            // 인증 시작 실패 시 비밀번호를 지우고 다시 시도할 수 있게 한다.
            setCurrentPassword("");
            setError(identityErrorCode(error));
            setBusy(false);
        }
    };

    const addPassword = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        // 비밀번호 정책과 이메일 인증 완료 여부를 먼저 확인한다.
        if (!validPassword(password)) return setError("AUTH_PASSWORD_INVALID");
        if (password !== confirmation) return setError("PASSWORD_MISMATCH");
        if (!verification.verificationToken) {
            return setError("EMAIL_VERIFICATION_REQUIRED");
        }

        setBusy(true);
        try {
            // 재인증 증명은 JS에 전달하지 않고 서버가 동일 로그인 세션의 쿠키에서 읽는다.
            await identityRequest("/api/account/password", {
                password,
                verificationToken: verification.verificationToken,
            });

            // 저장 후 민감한 입력을 지우고 사용 가능한 로그인 수단을 갱신한다.
            setPassword("");
            setConfirmation("");
            verification.reset();
            setSaved(true);
            await reload();
        } catch (error) {
            // 만료되거나 소비된 증명은 해당 인증 단계부터 다시 진행하게 한다.
            setError(identityErrorCode(error));
            if (
                identityErrorCode(error).includes("REAUTH") ||
                identityErrorCode(error) === "AUTH_PROOF_INVALID_OR_EXPIRED"
            ) {
                setAccount((value) => value ? { ...value, reauthenticated: false } : null);
            }
            if (
                identityErrorCode(error) === "AUTH_EMAIL_VERIFICATION_INVALID" ||
                identityErrorCode(error) === "AUTH_EMAIL_VERIFICATION_EXPIRED"
            ) {
                verification.reset();
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 px-4 pb-12 pt-24 sm:px-6">
            <SettingsSubPageHeader
                eyebrow="Account"
                title={t("accountTitle")}
                description={t("accountDescription")}
            />
            <AuthErrorMessage code={error ?? googleError} />
            {(saved || (googleResult === "linked" && account?.googleLinked)) && (
                <p
                    role="status"
                    className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                    {saved ? t("passwordAdded") : t("googleLinkedSuccess")}
                </p>
            )}
            {loading && (
                <p role="status" className="p-6 text-sm text-slate-500">
                    {t("working")}
                </p>
            )}
            {!loading && !account && (
                <button className={authSecondaryClass} onClick={() => void reload()}>
                    {t("retry")}
                </button>
            )}
            {account && (
                <>
                    <section className={cardClass}>
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-orange-500" />
                            <h2 className="font-bold text-slate-900 dark:text-white">
                                {t("accountEmail")}
                            </h2>
                        </div>
                        <p className="break-all text-slate-700 dark:text-slate-200">
                            {account.email}
                        </p>
                        {account.birthDate && (
                            <p className="text-sm text-slate-500">
                                {t("birthDate")}: {account.birthDate}
                            </p>
                        )}
                    </section>

                    <section className={cardClass}>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="font-bold text-slate-900 dark:text-white">Google</h2>
                            <span className="text-sm text-slate-500">
                                {account.googleLinked ? t("connected") : t("notConnected")}
                            </span>
                        </div>
                        {account.googleLinked ? (
                            <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-4 w-4" />
                                {t("googleAvailable")}
                            </p>
                        ) : (
                            <form
                                className="space-y-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void startGoogle("LINK");
                                }}
                            >
                                <p className="text-sm leading-6 text-slate-500">
                                    {t("linkGoogleDescription")}
                                </p>
                                <AuthField
                                    id="link-current-password"
                                    label={t("currentPassword")}
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    disabled={busy}
                                />
                                <button className={authButtonClass} disabled={busy || !currentPassword}>
                                    {busy ? t("working") : t("linkGoogle")}
                                </button>
                            </form>
                        )}
                    </section>

                    <section className={cardClass}>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                                <KeyRound className="h-5 w-5 text-orange-500" />
                                {t("emailLogin")}
                            </h2>
                            <span className="text-sm text-slate-500">
                                {account.hasPassword ? t("connected") : t("notConnected")}
                            </span>
                        </div>
                        {account.hasPassword ? (
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                {t("passwordAvailable")}
                            </p>
                        ) : (
                            <>
                                <p className="text-sm leading-6 text-slate-500">
                                    {t("addPasswordDescription")}
                                </p>
                                {!account.reauthenticated ? (
                                    <button
                                        className={authButtonClass}
                                        disabled={busy}
                                        onClick={() => void startGoogle("REAUTHENTICATE")}
                                    >
                                        {busy ? t("working") : t("reauthenticateGoogle")}
                                    </button>
                                ) : (
                                    <form className="space-y-4" onSubmit={addPassword}>
                                        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
                                            {t("reauthenticated")}
                                        </p>
                                        <EmailVerificationFields
                                            verification={verification}
                                            canSend
                                            disabled={busy}
                                        />
                                        {verification.verified && (
                                            <PasswordFields
                                                password={password}
                                                confirmation={confirmation}
                                                onPassword={setPassword}
                                                onConfirmation={setConfirmation}
                                                disabled={busy}
                                            />
                                        )}
                                        <button
                                            className={authButtonClass}
                                            disabled={busy || !verification.verified}
                                        >
                                            {busy ? t("working") : t("addPassword")}
                                        </button>
                                    </form>
                                )}
                            </>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
