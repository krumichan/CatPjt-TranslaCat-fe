"use client";

import SpinLoader from "@/components/common/SpinLoader";

interface Option<T> {
    code: T;
    label: string;
}

interface CapsuleTabProps<T> {
    options: Option<T>[];
    activeValue: T;
    onChange: (value: T) => void;
    isLoading: boolean;
}

export default function CapsuleTab<T>({
    options,
    activeValue,
    onChange,
    isLoading
}: CapsuleTabProps<T>) {

    const isInitialLoading = options.length === 0;

    return (
        <div
            className="relative flex flex-wrap justify-center gap-2 p-1.5 bg-black/5 dark:bg-black/40 rounded-2xl min-h-[44px] min-w-[200px]"
        >
            {(isLoading || isInitialLoading || !activeValue) && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-black/20 rounded-2xl z-10 backdrop-blur-[2px]"
                >
                    <SpinLoader isLoading={true} size="md"/>
                </div>
            )}

            {/* 3. 옵션들은 로딩 중이라도 일단 그려두거나, 없을 때는 투명한 공간만 차지하게 한다. */}
            {options.map((opt) => (
                <button
                    key={String(opt.code)}
                    onClick={() => onChange(opt.code)}
                    // 로딩 중에는 클릭 못하게 막기
                    disabled={isLoading || !activeValue}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                        activeValue === opt.code
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                            : "text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200"
                    } ${(isLoading || !activeValue) ? "opacity-30" : "opacity-100"}`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}