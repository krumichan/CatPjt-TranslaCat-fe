"use client";

import React, { useState, useMemo } from 'react';
import { MessageCircle, User, MoreHorizontal } from 'lucide-react';
import { HEADER_HEIGHT } from "@/constants/layout";
import TabButton from "@/components/chat/TabButton";
import FriendList from "@/components/chat/FriendList";
import ChatList from "@/components/chat/ChatList";
import MoreMenu from "@/components/chat/MoreMenu";

interface TabConfig {
    id: string;
    label: string;
    icon: React.ReactElement;
    component: React.ReactNode;
}

export default function ChatListPage() {
    const [activeTab, setActiveTab] = useState<string>('chat');

    // メニューの設定
    const TABS: TabConfig[] = useMemo(() => [
        {
            id: 'friends',
            label: '友達',
            icon: <User />,
            component: <FriendList />
        },
        {
            id: 'chat',
            label: '会話',
            icon: <MessageCircle />,
            component: <ChatList />
        },
        {
            id: 'more',
            label: 'その他',
            icon: <MoreHorizontal />,
            component: <MoreMenu />
        }
    ], []);

    // 現在アクティブなコンポーネントを特定
    const ActiveComponent = TABS.find(tab => tab.id === activeTab)?.component || <ChatList />;

    return (
        <div
            style={{ paddingTop: `${HEADER_HEIGHT}px` }}
            className="flex flex-col h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-white overflow-hidden"
        >
            {/* メインコンテンツ */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto h-full">
                    {ActiveComponent}
                </div>
            </main>

            {/* ナビゲーションバー：mapで自動生成(じどうせいせい) */}
            <nav className="w-full border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 z-20">
                <div className="max-w-6xl mx-auto flex justify-around py-3 px-4">
                    {TABS.map((tab) => (
                        <TabButton
                            key={tab.id}
                            icon={tab.icon}
                            label={tab.label}
                            active={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                        />
                    ))}
                </div>
            </nav>
        </div>
    );
}