"use client";

import RubyText from "@/components/common/RubyText";
import {TranslationUnit} from "@/types/common";

interface Props {
    contents: TranslationUnit[];
    fontSize: number;
    ln: (val: TranslationUnit) => string;
}

export default function EpisodeViewer({ contents, fontSize, ln }: Props) {
    return (
        <article
            className="space-y-10 md:space-y-14 leading-[2.3] font-serif break-words [word-break:break-word] [overflow-wrap:anywhere]"
            style={{ fontSize: `${fontSize}px` }}
        >
            {contents.map((unit, index) => (
                <div key={index} className="group relative transition-all duration-300">
                    <div className="relative z-10 transition-transform duration-300 group-hover:translate-x-2">
                        <RubyText content={ln(unit)} />
                    </div>
                    {/* 읽기 가이드 라인 */}
                    <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500/0 via-orange-500/40 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-full" />
                </div>
            ))}
        </article>
    );
}