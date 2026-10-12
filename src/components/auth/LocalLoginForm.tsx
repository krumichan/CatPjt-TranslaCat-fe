"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Link, useRouter } from "@/navigation";
import { AuthErrorMessage, AuthField, authButtonClass } from "@/components/auth/AuthFormParts";

export default function LocalLoginForm() {
    const t = useTranslations("Auth");
    const locale = useLocale();
    const router = useRouter();
    const query = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            // Credentials 공급자가 서버에서 BE에 연결하고 성공한 경우에만 세션을 발급한다.
            const result = await signIn("credentials", {
                email: email.trim(),
                password,
                redirect: false,
                callbackUrl: `/${locale}`,
            });

            // 결과와 관계없이 비밀번호를 지우고 성공한 세션만 메인 화면으로 이동한다.
            setPassword("");
            if (!result?.ok || result.error) {
                setError(result?.error === "CredentialsSignin"
                    ? "AUTH_INVALID_CREDENTIALS"
                    : result?.error ?? "AUTH_UNAVAILABLE");
                return;
            }
            router.replace("/");
            router.refresh();
        } catch {
            setPassword("");
            setError("AUTH_UNAVAILABLE");
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            {query.get("registered") === "1" && (
                <p
                    role="status"
                    className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                    {t("registered")}
                </p>
            )}
            <AuthErrorMessage code={error ?? query.get("authError")} />
            <AuthField
                id="login-email"
                label={t("email")}
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
            />
            <AuthField
                id="login-password"
                label={t("password")}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
            />
            <button type="submit" className={`${authButtonClass} w-full`} disabled={busy}>
                {busy ? t("working") : t("login")}
            </button>
            <p className="text-center text-sm text-slate-500">
                {t("noAccount")}{" "}
                <Link
                    href="/register"
                    className="font-bold text-orange-600 hover:underline dark:text-orange-400"
                >
                    {t("register")}
                </Link>
            </p>
        </form>
    );
}
