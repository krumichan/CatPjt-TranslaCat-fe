import {Link} from "@/navigation";

export default function Logo() {
    return (
        <Link
            href="/"
            className="text-2xl font-black text-blue-600 dark:text-blue-400 hover:opacity-80 transition-all tracking-tighter"
        >
            TranslaCat
        </Link>
    );
};