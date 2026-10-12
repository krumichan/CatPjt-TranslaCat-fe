"use client";

import { Suspense, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/navigation";
import { AuthPageFrame } from "@/components/auth/AuthFormParts";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import LocalLoginForm from "@/components/auth/LocalLoginForm";
import FullPageLoader from "@/components/common/FullPageLoader";
import { isTerminalAuthError } from "@/lib/authError";

export default function LoginPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const t = useTranslations("Auth");

    useEffect(() => {
        if (status === "authenticated" && session && !isTerminalAuthError(session.error)) router.replace("/");
    }, [status, session, router]);

    if (status !== "unauthenticated") return <FullPageLoader />;

    return <AuthPageFrame title={t("loginTitle")} description={t("loginDescription")} paperBackground>
        <Suspense fallback={<FullPageLoader />}><LocalLoginForm /></Suspense>
        <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />{t("or")}<span className="h-px flex-1 bg-slate-200 dark:bg-white/10" /></div>
        <div className="flex justify-center"><GoogleLoginButton label={t("googleLogin")} /></div>
    </AuthPageFrame>;
}
