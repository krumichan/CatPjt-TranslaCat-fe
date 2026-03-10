import {signIn} from "next-auth/react";
import Image from "next/image";
import { useLocale } from "next-intl";

export default function GoogleLoginButton({ label }: { label: string }) {
    const locale = useLocale();

    const buttonStyle = `
        px-6 py-3 bg-white border border-gray-300 rounded-lg
        flex items-center shadow-sm hover:bg-gray-50
        text-black transition-colors duration-200
    `;

    return (
        <button
            onClick={() => signIn("google", {callbackUrl: `/${locale}`})}
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
    );
}