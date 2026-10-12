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
        px-6 py-3 bg-white border border-gray-300 rounded-lg
        flex items-center shadow-sm hover:bg-gray-50
        text-black transition-colors duration-200
    `;

    return (
        <div className="space-y-3">
            <button
                type="button"
                disabled={busy}
                onClick={() => void login()}
                className={buttonStyle}
            >
                <Image
                    src="https://authjs.dev/img/providers/google.svg"
                    alt="Google"
                    width={20}
                    height={20}
                    className="mr-3"
                />
                {label}
            </button>
            <AuthErrorMessage code={error} />
        </div>
    );
}
