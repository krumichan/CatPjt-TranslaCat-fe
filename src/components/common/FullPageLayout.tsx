"use client";

import { useEffect, useState, ReactNode } from "react";

interface FullPageLayoutProps {
    children?: ReactNode; // 위에 얹을 내용 (글자, 버튼 등)
    isError?: boolean;    // 에러 상태일 때 스타일 변경용
}

export default function FullPageLayout({ children, isError = false }: FullPageLayoutProps) {
    const [randomIdx, setRandomIdx] = useState<number | null>(null);

    const loaderGifs = [
        "/images/gif/translacat_loading_1.gif",
        "/images/gif/translacat_loading_2.gif",
        "/images/gif/translacat_loading_3.gif",
    ];

    useEffect(() => {
        const handle = requestAnimationFrame(() => {
            const idx = Math.floor(Math.random() * loaderGifs.length);
            setRandomIdx(idx);
        });
        return () => cancelAnimationFrame(handle);
    }, [loaderGifs.length]);

    if (randomIdx === null) return null;

    return (
        <div
            className="fixed inset-0 -z-10 bg-[url('/images/translacat_common_background.png')] bg-cover bg-center bg-fixed bg-no-repeat transition-all duration-500 dark:brightness-[0.8]"
        >
            <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center dark:bg-black/40 backdrop-blur-md">

                {/* 로고와 GIF를 감싸는 중앙 컨테이너 */}
                {/*<div className={`relative flex flex-col items-center justify-center`}>*/}
                <div className={`flex flex-col items-center justify-center w-full h-full ${isError ? "pb-40" : "pb-0"} transition-[padding] duration-500`}>

                    <div className="relative flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={loaderGifs[randomIdx]}
                            alt="Loading..."
                            className="max-w-none object-none mix-blend-multiply opacity-80"
                        />
                    </div>
                </div>

                {/* 에러 메시지와 버튼은 이미지 아래에 절대 좌표나 마진으로 배치 */}
                {isError && (
                    <div className="absolute top-[calc(50%+60px)] flex flex-col items-center animate-in fade-in duration-700">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}