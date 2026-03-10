import {useTheme} from "next-themes";
import {useEffect, useState} from "react";
import {Moon, Sun} from "lucide-react";

export default function ThemeSwitcher() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="p-2 w-9 h-9"/>;
    }

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2.5 rounded-xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all active:scale-95 group"
            aria-label="Toggle Theme"
        >
            {theme === "dark" ? (
                <Moon size={20} className="text-blue-400 fill-blue-400/10 transition-transform group-hover:-rotate-12" />
            ) : (
                <Sun size={20} className="text-orange-500 fill-orange-500/10 transition-transform group-hover:rotate-45" />
            )}
        </button>
    );
}