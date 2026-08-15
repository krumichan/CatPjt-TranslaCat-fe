"use client";

import {
    ArrowRight,
    BookOpen,
    GraduationCap,
    MessageCircle,
    Mic,
    WalletCards,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Link } from "@/navigation";

const SERVICE_CARD_STYLE = cn(
    "group relative rounded-2xl border-2 border-transparent bg-white/80 p-8",
    "backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl",
    "dark:bg-zinc-800/80",
);

export function ServiceSelectPage() {
    const t = useTranslations("ServiceSelect");

    const services = [
        {
            id: "novel",
            title: t("novelTitle"),
            description: t("novelDesc"),
            icon: BookOpen,
            href: "/novel",
            color: "hover:border-blue-400",
            iconColor: "text-blue-500",
            titleHoverColor: "group-hover:text-blue-500",
        },
        {
            id: "voice",
            title: t("voiceTitle"),
            description: t("voiceDesc"),
            icon: Mic,
            href: "/voice",
            color: "hover:border-green-400",
            iconColor: "text-green-500",
            titleHoverColor: "group-hover:text-green-500",
        },
        {
            id: "accountBook",
            title: t("accountBookTitle"),
            description: t("accountBookDesc"),
            icon: WalletCards,
            href: "/account-books",
            color: "hover:border-orange-400",
            iconColor: "text-orange-500",
            titleHoverColor: "group-hover:text-orange-500",
        },
        {
            id: "chat",
            title: t("chatTitle"),
            description: t("chatDesc"),
            icon: MessageCircle,
            href: "/chat",
            color: "hover:border-purple-400",
            iconColor: "text-purple-500",
            titleHoverColor: "group-hover:text-purple-500",
        },
        {
            id: "languageLearning",
            title: t("languageLearningTitle"),
            description: t("languageLearningDesc"),
            icon: GraduationCap,
            href: "/language-learning",
            color: "hover:border-cyan-400",
            iconColor: "text-cyan-500",
            titleHoverColor: "group-hover:text-cyan-500",
        },
    ] as const;

    return (
        <main
            className={cn(
                "flex min-h-[calc(100vh-60px)] flex-col items-center",
                "justify-center p-6",
            )}
        >
            <div className="mb-12 text-center">
                <h1 className="mb-4 text-4xl font-bold text-gray-800 dark:text-white">
                    {t("title")}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                    {t("description")}
                </p>
            </div>

            <div
                className={cn(
                    "grid w-full max-w-7xl grid-cols-1 gap-6 md:grid-cols-2",
                    "lg:grid-cols-3 xl:grid-cols-5",
                )}
            >
                {services.map((service) => {
                    const Icon = service.icon;

                    return (
                        <Link
                            key={service.id}
                            href={service.href}
                            data-testid={`service-card-${service.id}`}
                            className={cn(
                                SERVICE_CARD_STYLE,
                                service.color,
                            )}
                        >
                            <div
                                className={cn(
                                    "mb-8 inline-flex h-20 w-20 items-center justify-center",
                                    "rounded-2xl bg-gray-50 shadow-inner transition-colors",
                                    "duration-300 group-hover:bg-white dark:bg-zinc-700",
                                    "dark:group-hover:bg-zinc-600",
                                )}
                            >
                                <Icon
                                    className={cn(
                                        "h-12 w-12 transition-transform duration-300",
                                        "group-hover:scale-110",
                                        service.iconColor,
                                    )}
                                    aria-hidden="true"
                                />
                            </div>

                            <h2
                                className={cn(
                                    "mb-3 text-2xl font-bold text-gray-800 transition-colors",
                                    "dark:text-white",
                                    service.titleHoverColor,
                                )}
                            >
                                {service.title}
                            </h2>

                            <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                                {service.description}
                            </p>

                            <div className="mt-6 flex items-center text-sm font-semibold text-blue-500">
                                {t("start")}
                                <ArrowRight
                                    className={cn(
                                        "ml-2 h-4 w-4 transition-transform duration-300",
                                        "group-hover:translate-x-2",
                                    )}
                                    aria-hidden="true"
                                />
                            </div>
                        </Link>
                    );
                })}
            </div>
        </main>
    );
}
