"use client";

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, ArrowLeft, Check, User, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { HEADER_HEIGHT } from "@/constants/layout";

export default function ProfileSetupPage() {
    const router = useRouter();

    // フォームの状態管理(じょうたいかんり)
    const [nickname, setNickname] = useState('');
    const [comment, setComment] = useState('');
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const [bgPreview, setBgPreview] = useState<string | null>(null);

    // ファイル入力(にゅうりょく)のリファレンス
    const iconInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);

    // 画像選択(がぞうせんたく)時のハンドラ (今はプレビュー表示のみ)
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'bg') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'icon') setIconPreview(reader.result as string);
                else setBgPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        // TODO: APIが完成したらここで friendService.saveProfile() を呼ぶ
        console.log({ nickname, comment, iconPreview, bgPreview });
        alert("保存されました！(仮)");
        router.push('/chat');
    };

    return (
        <div
            style={{ paddingTop: `${HEADER_HEIGHT}px` }}
            className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-white"
        >
            {/* ヘッダー */}
            <header className="p-4 flex items-center justify-between border-b dark:border-zinc-800 sticky top-15 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">プロフィール設定</h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!nickname.trim()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-zinc-800 text-white px-4 py-2 rounded-xl font-bold transition shadow-md"
                >
                    <Check className="w-5 h-5" />
                    保存
                </button>
            </header>

            <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8">

                {/* 1. 背景画像設定 */}
                <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-500 ml-1">背景画像</label>
                    <div
                        className="relative h-48 w-full rounded-3xl bg-gray-100 dark:bg-zinc-900 overflow-hidden border-2 border-dashed border-gray-200 dark:border-zinc-800 cursor-pointer group"
                        onClick={() => bgInputRef.current?.click()}
                    >
                        {bgPreview ? (
                            <Image src={bgPreview} alt="Background" fill className="w-full h-fullobject-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                <ImageIcon className="w-10 h-10 mb-2" />
                                <p className="text-xs">クリックして画像をアップロード</p>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="text-white w-8 h-8" />
                        </div>
                    </div>
                    <input type="file" ref={bgInputRef} hidden accept="image/*" onChange={(e) => handleImageChange(e, 'bg')} />
                </div>

                {/* 2. アイコン画像設定 */}
                <div className="flex flex-col items-center -mt-20 relative z-20">
                    <div
                        className="relative w-32 h-32 rounded-[40px] bg-white dark:bg-zinc-800 p-1 shadow-2xl cursor-pointer group"
                        onClick={() => iconInputRef.current?.click()}
                    >
                        <div className="w-full h-full rounded-[36px] bg-gray-200 dark:bg-zinc-700 overflow-hidden flex items-center justify-center border-4 border-white dark:border-zinc-800">
                            {iconPreview ? (
                                <Image src={iconPreview} alt="Icon" fill className="object-cover" />
                            ) : (
                                <User className="w-16 h-16 text-gray-400" />
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform">
                            <Camera className="w-5 h-5" />
                        </div>
                    </div>
                    <input type="file" ref={iconInputRef} hidden accept="image/*" onChange={(e) => handleImageChange(e, 'icon')} />
                </div>

                {/* 3. テキスト入力エリア */}
                <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-500 ml-1">ニックネーム (必須)</label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="名前を入力してください"
                            className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-500 ml-1">一言コメント</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="今の気持ちを教えてください"
                            rows={3}
                            className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}