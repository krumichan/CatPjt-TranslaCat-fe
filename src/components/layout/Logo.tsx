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
            className={`
                whitespace-nowrap
                font-black
                tracking-tighter
                text-blue-600
                transition-all
                hover:opacity-80
                dark:text-blue-400
                ${className ?? "text-2xl"}
            `}
        >
            TranslaCat
        </Link>
    );
}