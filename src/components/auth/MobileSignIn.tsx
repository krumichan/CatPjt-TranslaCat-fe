"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

import { AuthPageFrame, authButtonClass, authSecondaryClass } from "@/components/auth/AuthFormParts";
import { validMobileCallback } from "@/lib/mobileAuthPolicy";
import { identityRequest } from "@/services/identityClient";

const messages = {
    ko: {
        title: "앱에 로그인", description: "웹에서 확인한 계정으로 TranslaCat 앱에 로그인해요.",
        invalid: "로그인 요청이 올바르지 않아요. 앱에서 Google 로그인을 다시 시작해 주세요.",
        account: "이 계정으로 앱에 로그인합니다", approve: "이 계정으로 앱에 로그인", google: "Google로 로그인",
        another: "다른 Google 계정으로 로그인", waiting: "처리 중…", returning: "앱으로 돌아가기",
        confirm: "아래 버튼을 누르면 이 계정의 앱 로그인을 승인합니다. 직접 시작한 요청인지 확인해 주세요.",
        failed: "로그인을 완료하지 못했어요. 앱에서 다시 시작해 주세요.",
        expired: "요청이 만료되었거나 이미 승인되었어요. 앱에서 다시 시작해 주세요.",
        changed: "로그인 계정이나 화면이 변경되었어요. 페이지를 새로고침하고 계정을 다시 확인해 주세요.",
        unavailable: "웹 로그인을 확인할 수 없어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.",
    },
    ja: {
        title: "アプリにログイン", description: "Webで確認したアカウントでTranslaCatアプリにログインします。",
        invalid: "ログインのリクエストが正しくありません。アプリからGoogleログインをやり直してください。",
        account: "このアカウントでアプリにログインします", approve: "このアカウントでアプリにログイン", google: "Googleでログイン",
        another: "別のGoogleアカウントでログイン", waiting: "処理中…", returning: "アプリに戻る",
        confirm: "下のボタンを押すとアプリへのログインを承認します。ご自身で開始したリクエストか確認してください。",
        failed: "ログインを完了できませんでした。アプリからやり直してください。",
        expired: "リクエストが期限切れ、または承認済みです。アプリからやり直してください。",
        changed: "アカウントまたは画面が変更されました。ページを再読み込みして確認してください。",
        unavailable: "Webログインを確認できません。ページを再読み込みしてお試しください。",
    },
    en: {
        title: "Sign in to the app", description: "Use your verified web account to sign in to the TranslaCat app.",
        invalid: "This sign-in request is invalid. Start Google sign-in again in the app.",
        account: "Account for app sign-in", approve: "Sign in to the app with this account", google: "Sign in with Google",
        another: "Use another Google account", waiting: "Working…", returning: "Return to the app",
        confirm: "The button below approves app sign-in with this account. Continue only if you started this request.",
        failed: "Sign-in could not be completed. Start again in the app.",
        expired: "This request has expired or was already approved. Start again in the app.",
        changed: "The account or page has changed. Reload this page and confirm your account again.",
        unavailable: "Your web sign-in could not be verified. Reload this page and try again.",
    },
};

export default function MobileSignIn({ locale, requestId, callbackPath, csrfToken, account, unavailable = false }: {
    locale: string;
    requestId: string | null;
    callbackPath: string | null;
    csrfToken: string | null;
    account: { name: string | null; email: string | null; publicId: string } | null;
    unavailable?: boolean;
}) {
    const text = messages[locale === "learning" ? "ja" : locale as keyof typeof messages] ?? messages.ko;
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [callbackUrl, setCallbackUrl] = useState<string | null>(null);

    async function google() {
        if (!callbackPath || busy) return;
        setBusy(true);
        setError(null);
        try {
            // 기존 Google 연결/재인증 문맥을 정리하고 같은 호스트의 승인 화면으로만 복귀한다.
            await identityRequest("/api/account/google/cancel", {});
            await signIn("google", { callbackUrl: callbackPath }, { prompt: "select_account" });
        } catch {
            setError(text.failed);
            setBusy(false);
        }
    }

    async function approve() {
        if (!requestId || !csrfToken || busy) return;
        setBusy(true);
        setError(null);
        try {
            // 화면을 열거나 로그인한 것만으로 승인하지 않는다. 이 버튼의 POST만 권한을 만든다.
            const response = await fetch("/api/auth/mobile/approve", {
                method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer",
                headers: { "Content-Type": "application/json", "X-TranslaCat-Mobile-CSRF": csrfToken },
                body: JSON.stringify({ requestId }),
            });
            const result = await response.json().catch(() => null);
            if (!response.ok) {
                const code = result?.body?.errorCode;
                setError(["MOBILE_AUTH_EXPIRED", "MOBILE_AUTH_ALREADY_APPROVED", "MOBILE_AUTH_ALREADY_USED"].includes(code)
                    ? text.expired : ["MOBILE_AUTH_CSRF_INVALID", "AUTH_REQUIRED"].includes(code) ? text.changed : text.failed);
                return;
            }
            const callback = result?.body?.callbackUrl;
            if (!validMobileCallback(callback, requestId)) { setError(text.failed); return; }
            setCallbackUrl(callback);
            window.location.assign(callback);
        } catch {
            setError(text.failed);
        } finally {
            setBusy(false);
        }
    }

    return <AuthPageFrame title={text.title} description={text.description}>
        {!requestId || !callbackPath ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{text.invalid}</p>
            : unavailable ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{text.unavailable}</p>
                : <div className="space-y-4">
                    {account && csrfToken && !callbackUrl && <>
                        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                            <p className="text-xs text-slate-500 dark:text-slate-400">{text.account}</p>
                            <p className="mt-2 break-words font-bold text-slate-900 dark:text-white">{account.email || account.name || account.publicId}</p>
                            {account.email && account.name && <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">{account.name}</p>}
                        </div>
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{text.confirm}</p>
                        <button type="button" className={`${authButtonClass} w-full`} disabled={busy} onClick={() => void approve()}>
                            {busy ? text.waiting : text.approve}
                        </button>
                    </>}
                    {callbackUrl ? <button type="button" className={`${authButtonClass} w-full`} onClick={() => window.location.assign(callbackUrl)}>{text.returning}</button>
                        : <button type="button" className={`${account ? authSecondaryClass : authButtonClass} w-full`} disabled={busy} onClick={() => void google()}>
                            {busy ? text.waiting : account ? text.another : text.google}
                        </button>}
                    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
                </div>}
    </AuthPageFrame>;
}
