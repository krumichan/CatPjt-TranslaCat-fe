"use client";

import { useTranslations } from "next-intl";

import { AuthErrorMessage, AuthField, authSecondaryClass } from "@/components/auth/AuthFormParts";
import type { useEmailVerification } from "@/hooks/auth/useEmailVerification";

export default function EmailVerificationFields({ verification, canSend, disabled = false }: {
    verification: ReturnType<typeof useEmailVerification>;
    canSend: boolean;
    disabled?: boolean;
}) {
    const t = useTranslations("Auth");
    const v = verification;
    return (
        <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            {v.verified ? (
                <p role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {t("emailVerified")}
                </p>
            ) : (
                <>
                    <button
                        type="button"
                        className={`${authSecondaryClass} w-full`}
                        onClick={() => void v.send()}
                        disabled={disabled || v.busy || !canSend || v.resendIn > 0}
                    >
                        {v.busy
                            ? t("working")
                            : v.resendIn > 0
                                ? t("resendCountdown", { seconds: v.resendIn })
                                : v.challenge
                                    ? t("resendCode")
                                    : t("sendCode")}
                    </button>
                    {v.challenge && (
                        <>
                            <p role="status" className="text-xs leading-5 text-slate-500">
                                {v.expired
                                    ? t("codeExpired")
                                    : t("codeSent", { seconds: v.remaining })}
                            </p>
                            <AuthField
                                id="email-code"
                                label={t("code")}
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={v.code}
                                onChange={(e) => v.setCode(e.target.value.replace(/\D/g, ""))}
                                disabled={disabled || v.busy || v.expired}
                            />
                            <button
                                type="button"
                                className={`${authSecondaryClass} w-full`}
                                onClick={() => void v.verify()}
                                disabled={disabled || v.busy || v.expired || !/^\d{6}$/.test(v.code)}
                            >
                                {t("verifyCode")}
                            </button>
                        </>
                    )}
                </>
            )}
            <AuthErrorMessage code={v.error} />
        </div>
    );
}
