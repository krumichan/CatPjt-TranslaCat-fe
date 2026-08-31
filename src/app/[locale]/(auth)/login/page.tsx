"use client";

import { useSession } from "next-auth/react";
import {useRouter} from "@/navigation";
import {useEffect} from "react";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import {useTranslations} from "next-intl";
import Image from "next/image";
import FullPageLoader from "@/components/common/FullPageLoader";
import {isTerminalAuthError} from "@/lib/authError";

export default function LoginPage() {
    const {data: session, status} = useSession();
    const router = useRouter();
    const t = useTranslations('Login');

    useEffect(() => {
        if (
            status === "authenticated"
            && session
            && !isTerminalAuthError(session.error)
        ) {
            router.replace("/");
        }
    }, [status, session, router]);

    if (status === "loading" || isTerminalAuthError(session?.error)) {
        return (
            <FullPageLoader />
        );
    }

    if (status === "unauthenticated") {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center
                bg-[url('/images/translacat_common_background.png')] bg-cover bg-center bg-fixed bg-no-repeat px-4">

                <div
                    className="relative w-80 h-80 md:w-96 md:h-96 -mt-12 mb-2 animate-in fade-in zoom-in duration-1000">
                    <Image
                        src="/images/translacat_log_transparent.png"
                        alt="Translacat Logo"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>

                <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <p className="text-gray-600 text-lg">
                        {/* "고양이와 함께 읽는 세계의 소설" 같은 문구를 번역파일에 넣어보세요! */}
                        {t('description')}
                    </p>
                </div>

                <div
                    className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <GoogleLoginButton label={t('googleButton')}/>
                </div>

                <p className="mt-16 text-xs text-gray-400 font-mono">
                    © 2026 Cat Series - headacat & translacat
                </p>
            </div>
        );
    }

    return null;
}