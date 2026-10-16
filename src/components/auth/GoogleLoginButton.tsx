import { signIn } from "next-auth/react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { useState } from "react";

import { identityRequest, identityErrorCode } from "@/services/identityClient";
import { AuthErrorMessage } from "@/components/auth/AuthFormParts";

export default function GoogleLoginButton({ label }: { label: string }) {
    const locale = useLocale();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = async () => {
        setBusy(true);
        setError(null);
        try {
            // 취소한 연결 시도의 callback이 일반 로그인으로 해석되지 않도록 먼저 정리한다.
            await identityRequest("/api/account/google/cancel", {});
            await signIn("google", { callbackUrl: `/${locale}` });
        } catch (error) {
            setError(identityErrorCode(error));
            setBusy(false);
        }
    };

    const buttonStyle = `
        h-12 w-12 bg-white border border-gray-300 rounded-full
        inline-flex items-center justify-center shadow-sm hover:bg-gray-50
        text-black transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        disabled:cursor-wait disabled:opacity-60
    `;

    return (
        <div className="flex flex-col items-center gap-3">
            <button
                type="button"
                disabled={busy}
                onClick={() => void login()}
                aria-label={label}
                className={buttonStyle}
            >
                <Image
                    src="https://authjs.dev/img/providers/google.svg"
                    alt=""
                    width={20}
                    height={20}
                />
            </button>
            <AuthErrorMessage code={error} />
        </div>
    );
}
