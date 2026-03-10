"use client";

import {useLocale} from "next-intl";
import {usePathname, useRouter} from "@/navigation";
import {Locale, localeMetadata, locales} from "@/i18n/config";
import {useEffect, useRef, useState} from "react";

export default function LanguageSwitcher() {
    const locale = useLocale() as Locale;
    const router = useRouter();
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);


        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const handleLocaleChange = (nextLocale: Locale) => {
        if (nextLocale === locale) {
            return;
        }

        router.replace(pathname, { locale: nextLocale });
        setIsOpen(false);
    }

    const currentMetadata = localeMetadata[locale];

    return (
        <div className="relative" ref={dropdownRef}>
            {/* 현재 언어 표시 버튼 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center gap-2 px-3 h-11 rounded-xl bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all active:scale-95 shadow-sm"
            >
                <span className="text-lg flex items-center justify-center leading-none h-full transform -translate-y-[1.5px]">
                    {currentMetadata.flag}
                </span>
                <span className={`text-[10px] flex items-center leading-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
        ▼
    </span>
            </button>

            {/* 드롭다운 메뉴 */}
            {isOpen && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 mt-2 w-20 py-2 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-[100] animate-in fade-in zoom-in-95 duration-200"
                >
                    {locales.map((loc) => (
                        <button
                            key={loc}
                            onClick={() => handleLocaleChange(loc)}
                            className={`w-full flex items-center justify-center px-4 py-2 text-sm transition-colors ${
                                locale === loc
                                    ? "bg-blue-600/10 text-blue-600 font-bold"
                                    : "text-gray-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                        >
                            <span className="text-base flex items-center leading-none">
                                {localeMetadata[loc].flag}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}