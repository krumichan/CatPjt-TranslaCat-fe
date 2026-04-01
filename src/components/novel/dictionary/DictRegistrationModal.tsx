"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BookPlus, Save, X, RotateCcw } from "lucide-react";
import {dictionaryService} from "@/services/dictionaryService";

interface DictRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSurface?: string;
    onSuccess?: (surface: string, reading: string) => void;
}

export default function DictRegistrationModal({
    isOpen,
    onClose,
    initialSurface = "",
    onSuccess
}: DictRegistrationModalProps) {
    const [surface, setSurface] = useState(initialSurface);
    const [reading, setReading] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    // SSR 대응: 클라이언트에서만 Portal이 작동하도록
    useEffect(() => {
        setMounted(true);
    }, []);

    // initialSurface가 바뀌면 (예: 본문에서 다른 단어 클릭 시) 반영
    useEffect(() => {
        setSurface(initialSurface);
    }, [initialSurface]);

    if (!mounted || !isOpen) return null;

    const handleRegister = async () => {

        // 1. 유효성 검사
        if (!surface.trim() || !reading.trim()) return;

        setIsSubmitting(true);
        try {

            // 2. 서비스 레이어 호출
            await dictionaryService.register(surface, reading);

            if (onSuccess) {
                onSuccess(surface.trim(), reading.trim());
            }

            setSurface("");
            setReading("");

            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 실제 렌더링은 body 하단으로 Portal 처리!
    return createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            {/* 배경 클릭 시 닫기 */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-black/5 dark:border-white/10 p-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-6">
                    <BookPlus size={20} />
                    <h2 className="text-xl font-bold dark:text-white">사전 등록</h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Surface</label>
                        <input
                            autoFocus
                            value={surface}
                            onChange={(e) => setSurface(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="ex) 漢字"
                            className="w-full px-5 py-3.5 bg-zinc-100 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Reading</label>
                        <input
                            value={reading}
                            onChange={(e) => setReading(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="ex) かんじ"
                            className="w-full px-5 py-3.5 bg-zinc-100 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex gap-2 mt-8">
                    <button onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 py-4 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-2xl transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleRegister}
                        disabled={isSubmitting}
                        className="flex-2 py-4 bg-orange-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-zinc-300"
                    >
                        {isSubmitting ? <RotateCcw size={18} className="animate-spin" /> : <Save size={18} />}
                        Register
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}