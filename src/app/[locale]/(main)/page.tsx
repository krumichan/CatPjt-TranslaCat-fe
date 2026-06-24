"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
    ArrowRight,
    BookOpen,
    MessageCircle,
    Mic,
    WalletCards,
} from "lucide-react";

export default function ServiceSelectPage() {
    const t = useTranslations("ServiceSelect");

    const services = [
        {
            id: "novel",
            title: t("novelTitle"),
            description: t("novelDesc"),
            icon: (
                <BookOpen className="h-12 w-12 text-blue-500 transition-transform duration-300 group-hover:scale-110" />
            ),
            href: "/novel",
            color: "hover:border-blue-400",
            titleHoverColor: "group-hover:text-blue-500",
        },
        {
            id: "voice",
            title: t("voiceTitle"),
            description: t("voiceDesc"),
            icon: (
                <Mic className="h-12 w-12 text-green-500 transition-transform duration-300 group-hover:scale-110" />
            ),
            href: "/voice",
            color: "hover:border-green-400",
            titleHoverColor: "group-hover:text-green-500",
        },
        {
            id: "accountBook",
            title: t("accountBookTitle"),
            description: t("accountBookDesc"),
            icon: (
                <WalletCards className="h-12 w-12 text-orange-500 transition-transform duration-300 group-hover:scale-110" />
            ),
            href: "/account-books",
            color: "hover:border-orange-400",
            titleHoverColor: "group-hover:text-orange-500",
        },
        {
            id: "chat",
            title: t("chatTitle"),
            description: t("chatDesc"),
            icon: (
                <MessageCircle className="h-12 w-12 text-purple-500 transition-transform duration-300 group-hover:scale-110" />
            ),
            href: "/chat/rooms/1",
            color: "hover:border-purple-400",
            titleHoverColor: "group-hover:text-purple-500",
        },
    ];

    return (
        <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center p-6">
            <div className="mb-12 text-center">
                <h1 className="mb-4 text-4xl font-bold text-gray-800 dark:text-white">
                    {t("title")}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                    {t("description")}
                </p>
            </div>

            <div className="grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                {services.map((service) => (
                    <Link
                        key={service.id}
                        href={service.href}
                        className={`group relative rounded-2xl border-2 border-transparent bg-white/80 p-8 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl dark:bg-zinc-800/80 ${service.color}`}
                    >
                        <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 shadow-inner transition-colors duration-300 group-hover:bg-white dark:bg-zinc-700 dark:group-hover:bg-zinc-600">
                            {service.icon}
                        </div>

                        <h2
                            className={`mb-3 text-2xl font-bold text-gray-800 transition-colors dark:text-white ${service.titleHoverColor}`}
                        >
                            {service.title}
                        </h2>

                        <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                            {service.description}
                        </p>

                        <div className="mt-6 flex items-center text-sm font-semibold text-blue-500">
                            {t("start")}
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-2" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}