"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Globe, MoreVertical, Shield } from 'lucide-react';
import { HEADER_HEIGHT } from "@/constants/layout";

interface Message {
    id: number;
    senderId: string;
    senderName: string;
    text: string;
    translatedText?: string;
    timestamp: string;
    lang: 'JA' | 'KO';
}

export default function ChatRoomPage() {
    const params = useParams();
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = useState('');

    // 仮のメッセージデータ
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, senderId: 'user2', senderName: 'キムさん', text: '안녕하세요! 오늘 회의 시간 확인 부탁드려요.', translatedText: 'こんにちは！今日の会議時間を確認してください。', timestamp: '14:00', lang: 'KO' },
        { id: 2, senderId: 'my-id', senderName: '自分', text: 'お疲れ様です。15時からですよ！', translatedText: '수고하셨습니다. 15시부터예요!', timestamp: '14:05', lang: 'JA' },
        { id: 3, senderId: 'user2', senderName: 'キムさん', text: '안녕하세요! 오늘 회의 시간 확인 부탁드려요.', translatedText: 'こんにちは！今日の会議時間を確認してください。', timestamp: '14:00', lang: 'KO' },
        { id: 4, senderId: 'my-id', senderName: '自分', text: 'お疲れ様です。15時からですよ！', translatedText: '수고하셨습니다. 15시부터예요!', timestamp: '14:05', lang: 'JA' },
        { id: 5, senderId: 'user2', senderName: 'キムさん', text: '안녕하세요! 오늘 회의 시간 확인 부탁드려요.', translatedText: 'こんにちは！今日の会議時間を確認してください。', timestamp: '14:00', lang: 'KO' },
        { id: 6, senderId: 'my-id', senderName: '自分', text: 'お疲れ様です。15時からですよ！', translatedText: '수고하셨습니다. 15시부터예요!', timestamp: '14:05', lang: 'JA' },
        { id: 7, senderId: 'user2', senderName: 'キムさん', text: '안녕하세요! 오늘 회의 시간 확인 부탁드려요.', translatedText: 'こんにちは！今日の会議時間を確認してください。', timestamp: '14:00', lang: 'KO' },
        { id: 8, senderId: 'my-id', senderName: '自分', text: 'お疲れ様です。15時からですよ！', translatedText: '수고하셨습니다. 15시부터예요!', timestamp: '14:05', lang: 'JA' },
        { id: 9, senderId: 'user2', senderName: 'キムさん', text: '안녕하세요! 오늘 회의 시간 확인 부탁드려요.', translatedText: 'こんにちは！今日の会議時間を確認してください。', timestamp: '14:00', lang: 'KO' },
        { id: 10, senderId: 'my-id', senderName: '自分', text: 'お疲れ様です。15時からですよ！', translatedText: '수고하셨습니다. 15시부터예요!', timestamp: '14:05', lang: 'JA' },
    ]);

    // メッセージ送信ハンドラ
    const handleSendMessage = () => {
        if (!inputValue.trim()) return;

        const newMessage: Message = {
            id: Date.now(),
            senderId: 'my-id',
            senderName: '自分',
            text: inputValue,
            translatedText: '（翻訳中...）', // 実際はここでAPIを叩(たた)く
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            lang: 'JA'
        };

        setMessages([...messages, newMessage]);
        setInputValue('');
    };

    // 新しいメッセージが来たら一番下までスクロール
    useEffect(() => {
        scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    }, [messages]);

    return (
        <div
            style={{ paddingTop: `${HEADER_HEIGHT}px` }}
            className="flex flex-col h-screen bg-[#F5F5F5] dark:bg-zinc-950 transition-colors duration-300"
        >
            {/* ルームヘッダー */}
            <header className="fixed top-15 left-0 w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 z-30">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                        </button>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                キムさん
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">KO</span>
                            </h2>
                            <p className="text-xs text-gray-500">オンライン</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-500"><Globe className="w-5 h-5" /></button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-500"><MoreVertical className="w-5 h-5" /></button>
                    </div>
                </div>
            </header>

            {/* チャットメッセージエリア */}
            <main
                ref={scrollRef}
                className="flex-1 overflow-y-auto pt-15 pb-24 px-4 space-y-6"
            >
                <div className="text-center py-4">
                    <span className="text-[10px] bg-gray-200 dark:bg-zinc-800 text-gray-500 px-3 py-1 rounded-full uppercase tracking-widest flex items-center justify-center w-fit mx-auto gap-1">
                        <Shield className="w-3 h-3" /> End-to-end Encrypted
                    </span>
                </div>

                {messages.map((msg) => {
                    const isMe = msg.senderId === 'my-id';
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                {!isMe && <span className="text-xs text-gray-500 mb-1 ml-1">{msg.senderName}</span>}

                                <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
                                    isMe
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 rounded-tl-none'
                                }`}>
                                    {/* 原本のテキスト */}
                                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>

                                    {/* 翻訳後のテキスト */}
                                    {msg.translatedText && (
                                        <div className={`mt-1.5 pt-1.5 border-t ${isMe ? 'border-blue-400' : 'border-gray-100 dark:border-zinc-800'}`}>
                                            <p className={`text-[11px] italic ${isMe ? 'text-blue-100' : 'text-blue-500 dark:text-blue-400'}`}>
                                                {msg.translatedText}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* 入力フォーム */}
            <footer className="fixed bottom-0 left-0 w-full bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-4 pb-safe">
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="メッセージを入力..."
                        className="flex-1 bg-gray-100 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                    />
                    <button
                        onClick={handleSendMessage}
                        className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-transform active:scale-90 shadow-md"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </footer>
        </div>
    );
}