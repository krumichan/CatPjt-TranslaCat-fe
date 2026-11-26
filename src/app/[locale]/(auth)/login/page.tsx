"use client";

import { Suspense, useEffect } from "react";
import { BookOpenText } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Link, useRouter } from "@/navigation";
import { AuthPageFrame } from "@/components/auth/AuthFormParts";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import LocalLoginForm from "@/components/auth/LocalLoginForm";
import FullPageLoader from "@/components/common/FullPageLoader";
import { isTerminalAuthError } from "@/lib/authError";
import { parseDocumentLoginReturn } from "@/features/document-translation/loginReturn";

/** 로그인 프록시의 복귀 주소는 클라이언트에서 읽는다. */
export default function LoginPage() {
    return <Suspense fallback={<FullPageLoader />}><LoginContent /></Suspense>;
}

// 문서 번역의 복귀 주소만 확인하고 다른 로그인 흐름은 홈으로 되돌린다.
function LoginContent() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const router = useRouter();
    const t = useTranslations("Auth");
    const locale = useLocale();
    const guideLocale = locale === "learning" ? "ja" : locale;
    const returnTo = typeof window === "undefined" ? undefined
        : parseDocumentLoginReturn(searchParams.get("callbackUrl"), window.location.origin);
    const returnHref = returnTo?.href;
    const returnLocale = returnTo?.locale;

    useEffect(() => {
        if (status !== "authenticated" || !session || isTerminalAuthError(session.error)) {
            return;
        }
        if (returnHref && returnLocale) {
            router.replace(returnHref, { locale: returnLocale });
        } else {
            router.replace("/");
        }
    }, [status, session, router, returnHref, returnLocale]);

    if (status !== "unauthenticated") return <FullPageLoader />;

    return <AuthPageFrame title={t("loginTitle")} description={t("loginDescription")}>
        <LocalLoginForm returnTo={returnTo} />
        <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />{t("or")}<span className="h-px flex-1 bg-slate-200 dark:bg-white/10" /></div>
        <div className="flex justify-center"><GoogleLoginButton label={t("googleLogin")} callbackUrl={returnTo?.pathname} /></div>
        <div className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10">
            <Link
                href="/guides"
                locale={guideLocale}
                data-testid="login-guide-link"
                className="flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-bold text-blue-600 transition hover:text-blue-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 dark:text-blue-400"
            >
                <BookOpenText className="h-4 w-4" aria-hidden="true" />
                {t("guideLink")}
            </Link>
            <p className="mt-1 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t("guideDescription")}
            </p>
        </div>
    </AuthPageFrame>;
}
