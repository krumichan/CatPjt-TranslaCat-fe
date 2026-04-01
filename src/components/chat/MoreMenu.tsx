"use client";

import React from 'react';
import {
    Settings,
    Globe,
    UserCircle,
    Bell,
    ShieldCheck,
    HelpCircle,
    LogOut,
    ChevronRight
} from 'lucide-react';

export default function MoreMenu() {
    // メニュー項目の定義
    const menuGroups = [
        {
            title: "サービス",
            items: [
                { id: 'open-chat', icon: <Globe className="text-orange-500" />, label: "オープンチャット検索", color: "bg-orange-50 dark:bg-orange-900/20" },
                { id: 'profile', icon: <UserCircle className="text-blue-500" />, label: "プロフィール設定", color: "bg-blue-50 dark:bg-blue-900/20" },
            ]
        },
        {
            title: "アプリ設定",
            items: [
                { id: 'notif', icon: <Bell className="text-purple-500" />, label: "通知設定", color: "bg-purple-50 dark:bg-purple-900/20" },
                { id: 'security', icon: <ShieldCheck className="text-green-500" />, label: "プライバシーとセキュリティ", color: "bg-green-50 dark:bg-green-900/20" },
            ]
        },
        {
            title: "サポート",
            items: [
                { id: 'help', icon: <HelpCircle className="text-gray-500" />, label: "ヘルプセンター", color: "bg-gray-50 dark:bg-gray-800/50" },
                { id: 'logout', icon: <LogOut className="text-red-500" />, label: "ログアウト", color: "bg-red-50 dark:bg-red-900/20" },
            ]
        }
    ];

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-zinc-950">
            {/* ヘッダー */}
            <header className="p-6 bg-white dark:bg-zinc-950 border-b dark:border-zinc-800 sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">その他</h1>
            </header>

            {/* コンテンツエリア */}
            <div className="flex-1 overflow-y-auto pb-10">

                {/* ユーザープロフィールカード */}
                <div className="p-6 bg-white dark:bg-zinc-950 mb-2">
                    <div className="flex items-center gap-4 p-5 bg-gray-100 dark:bg-zinc-900 rounded-3xl transition hover:bg-gray-200 dark:hover:bg-zinc-800 cursor-pointer group">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                            P
                        </div>
                        <div className="flex-1">
                            <h2 className="font-bold text-lg text-gray-900 dark:text-white">プログラマーさん</h2>
                            <p className="text-sm text-gray-500">dev_user_01@example.com</p>
                        </div>
                        <ChevronRight className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>

                {/* メニューリスト */}
                <div className="space-y-6 px-6">
                    {menuGroups.map((group, idx) => (
                        <div key={idx} className="space-y-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                {group.title}
                            </h3>
                            <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-800">
                                {group.items.map((item) => (
                                    <button
                                        key={item.id}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors border-b last:border-none border-gray-50 dark:border-zinc-800"
                                    >
                                        <div className={`p-2.5 rounded-xl ${item.color}`}>
                                            {React.cloneElement(item.icon, {className: "w-6 h-6"} as React.HTMLAttributes<SVGElement>)}
                                        </div>
                                        <span className="flex-1 text-left font-medium text-gray-700 dark:text-gray-200">
                                            {item.label}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}