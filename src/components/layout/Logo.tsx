import BrandWordmark from "@/components/layout/BrandWordmark";
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
            className={`inline-flex shrink-0 items-center transition-opacity hover:opacity-80 ${className ?? ""}`}
        >
            <BrandWordmark className="w-[145px] sm:w-[190px]" priority />
        </Link>
    );
}
