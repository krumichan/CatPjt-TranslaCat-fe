import Image from "next/image";

import { Link } from "@/navigation";

interface LogoProps {
    className?: string;
}

export default function Logo({
    className,
}: LogoProps) {
    return (
        <Link
            href="/"
            aria-label="TranslaCat"
            className={`inline-flex w-[145px] shrink-0 items-center transition-opacity hover:opacity-80 sm:w-[190px] ${className ?? ""}`}
        >
            <Image
                src="/images/translacat-wordmark-light.svg"
                alt=""
                width={300}
                height={72}
                className="block h-auto w-full dark:hidden"
            />
            <Image
                src="/images/translacat-wordmark-dark.svg"
                alt=""
                width={300}
                height={72}
                className="hidden h-auto w-full dark:block"
            />
        </Link>
    );
}
