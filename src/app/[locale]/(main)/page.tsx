"use client";

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {ArrowRight, BookOpen, MessageSquare, Mic} from "lucide-react";

export default function ServiceSelectPage() {
    const t = useTranslations('ServiceSelect');

    const services = [
        {
            id: 'novel',
            title: t('novelTitle'),
            description: t('novelDesc'),
            icon: <BookOpen className="w-12 h-12 text-blue-500 group-hover:scale-110 transition-transform duration-300" />,
            href: '/novel',
            color: 'hover:border-blue-400'
        },
        {
            id: 'voice',
            title: t('voiceTitle'),
            description: t('voiceDesc'),
            icon: <Mic className="w-12 h-12 text-green-500 group-hover:scale-110 transition-transform duration-300" />,
            href: '/voice',
            color: 'hover:border-green-400'
        },
        {
            id: 'chat',
            title: t('chatTitle'),
            description: t('chatDesc'),
            icon: <MessageSquare className="w-12 h-12 text-purple-500 group-hover:scale-110 transition-transform duration-300" />,
            href: '/chat',
            color: 'hover:border-purple-400'
        }
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] p-6">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
                    {t('title')}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                    {t('description')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {services.map((service) => (
                    <Link
                        key={service.id}
                        href={service.href}
                        className={`group relative p-8 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md rounded-2xl border-2 border-transparent transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl ${service.color}`}
                    >
                        <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-50 dark:bg-zinc-700 group-hover:bg-white dark:group-hover:bg-zinc-600 transition-colors duration-300 shadow-inner">
                            {service.icon}
                        </div>

                        <h2 className="text-2xl font-bold mb-3 text-gray-800 dark:text-white group-hover:text-blue-500 transition-colors">
                            {service.title}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            {service.description}
                        </p>
                        <div className="mt-6 flex items-center text-sm font-semibold text-blue-500">
                            {t('start')}
                            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}