"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

import {
    localeMetadata,
    locales,
    type Locale,
} from "@/i18n/config";
import {
    usePathname,
    useRouter,
} from "@/navigation";

interface LanguageSwitcherProps {
    placement?: "top" | "bottom";
    className?: string;
}

export default function LanguageSwitcher({
    placement = "bottom",
    className = "",
}: LanguageSwitcherProps) {
    const locale = useLocale() as Locale;
    const router = useRouter();
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (
            event: MouseEvent,
        ) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(
                    event.target as Node,
                )
            ) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutside,
        );
        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside,
            );
            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, []);

    const handleLocaleChange = (
        nextLocale: Locale,
    ) => {
        if (nextLocale === locale) {
            setIsOpen(false);
            return;
        }

        router.replace(pathname, {
            locale: nextLocale,
        });

        setIsOpen(false);
    };

    const currentMetadata =
        localeMetadata[locale];

    const buttonClassName =
        "flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-black/5 px-3 shadow-sm transition-all hover:bg-black/10 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20";

    const dropdownPositionClass =
        placement === "top"
            ? "bottom-full left-1/2 mb-2 -translate-x-1/2"
            : "left-1/2 top-full mt-2 -translate-x-1/2";

    const dropdownClassName = [
        "absolute z-[200] w-20 rounded-2xl border border-black/5 bg-white py-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 dark:border-white/10 dark:bg-zinc-900",
        dropdownPositionClass,
    ].join(" ");

    return (
        <div
            ref={dropdownRef}
            className={["relative", className]
                .filter(Boolean)
                .join(" ")}
        >
            <button
                type="button"
                onClick={() =>
                    setIsOpen((value) => !value)
                }
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label="Language"
                className={buttonClassName}
            >
        <span className="flex h-full -translate-y-[1.5px] items-center justify-center text-lg leading-none">
            {currentMetadata.flag}
        </span>

                <span
                    className={[
                        "flex items-center text-[10px] leading-none transition-transform duration-200",
                        isOpen ? "rotate-180" : "",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                >
            ▼
        </span>
            </button>

            {isOpen && (
                <div
                    role="menu"
                    className={dropdownClassName}
                >
                    {locales.map((loc) => (
                        <button
                            key={loc}
                            type="button"
                            role="menuitem"
                            onClick={() =>
                                handleLocaleChange(loc)
                            }
                            className={[
                                "flex w-full items-center justify-center px-4 py-2 text-sm transition-colors",
                                locale === loc
                                    ? "bg-blue-600/10 font-bold text-blue-600"
                                    : "text-gray-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5",
                            ].join(" ")}
                        >
                    <span className="flex items-center text-base leading-none">
                        {localeMetadata[loc].flag}
                    </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}