"use client";

import {
    ArrowRight,
    BookOpen,
    GraduationCap,
    Headset,
    MessageCircle,
    Mic,
    WalletCards,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import { Link } from "@/navigation";
import { ROUTES } from "@/constants/routes";

const SERVICE_CARD_STYLE = cn(
    "tc-service-accent tc-service-card group flex min-h-48 flex-col rounded-2xl",
    "border border-slate-200 bg-white/95 p-5 shadow-sm transition duration-200",
    "hover:-translate-y-1 hover:shadow-lg focus-visible:shadow-lg",
    "dark:border-slate-700 dark:bg-slate-900 dark:hover:shadow-black/20",
);

export function ServiceSelectPage() {
    const t = useTranslations("ServiceSelect");
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "ADMIN";

    const services = [
        {
            id: "novel",
            title: t("novelTitle"),
            description: t("novelDesc"),
            icon: BookOpen,
            href: ROUTES.NOVEL_SELECT,
            serviceKey: "platform",
        },
        {
            id: "voice",
            title: t("voiceTitle"),
            description: t("voiceDesc"),
            icon: Mic,
            href: ROUTES.VOICE_SELECT,
            serviceKey: "voice",
        },
        {
            id: "accountBook",
            title: t("accountBookTitle"),
            description: t("accountBookDesc"),
            icon: WalletCards,
            href: ROUTES.ACCOUNT_BOOKS,
            serviceKey: "accountBook",
        },
        {
            id: "chat",
            title: t("chatTitle"),
            description: t("chatDesc"),
            icon: MessageCircle,
            href: "/chat",
            serviceKey: "chat",
        },
        {
            id: "languageLearning",
            title: t("languageLearningTitle"),
            description: t("languageLearningDesc"),
            icon: GraduationCap,
            href: "/language-learning",
            serviceKey: "languageLearning",
        },
        {
            id: "support",
            title: t("supportTitle"),
            description: t("supportDesc"),
            icon: Headset,
            href: ROUTES.SUPPORT,
            serviceKey: "support",
        },
    ] as const;

    const visibleServices = services.filter(
        (service) => service.id !== "novel" || isAdmin,
    );

    return (
        <main
            className={cn(
                "mx-auto min-h-screen w-full max-w-7xl px-5 pb-12 pt-25",
                "sm:px-8 lg:pt-29",
            )}
        >
            <div className="mb-8 max-w-2xl">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                    TranslaCat
                </p>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                    {t("title")}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t("description")}
                </p>
            </div>

            <div
                className={cn(
                    "grid w-full grid-cols-1 gap-4 sm:grid-cols-2",
                    "xl:grid-cols-3",
                )}
            >
                {visibleServices.map((service) => {
                    const Icon = service.icon;

                    return (
                        <Link
                            key={service.id}
                            href={service.href}
                            data-testid={`service-card-${service.id}`}
                            data-service={service.serviceKey}
                            className={SERVICE_CARD_STYLE}
                        >
                            <div
                                className="tc-service-icon-wrap mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl"
                            >
                                <Icon
                                    className="tc-service-icon h-6 w-6"
                                    aria-hidden="true"
                                />
                            </div>

                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {service.title}
                            </h2>

                            <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
                                {service.description}
                            </p>

                            <div className="tc-service-action mt-auto flex items-center pt-5 text-sm font-bold">
                                {t("start")}
                                <ArrowRight
                                    className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
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
