"use client"

import {TranslationUnit} from "@/types/common";
import RubyText from "@/components/common/RubyText";
import React from "react";

interface VoiceHistoryProps {
    units: TranslationUnit[];
    scrollRef: React.RefObject<HTMLDivElement | null>;
    ln: (unit: TranslationUnit) => string;
    emptyMessage: string;
}

export const VoiceHistory = ({ units, scrollRef, ln, emptyMessage }: VoiceHistoryProps) => {
    return (
        <div className="flex flex-col gap-4 relative">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest">Transcript History</h3>
                <span className="text-[10px] text-zinc-400">{units.length} sentences recorded</span>
            </div>

            <div className="relative">
                <div className="absolute top-0 left-0 right-0 h-10 bg-linear-to-b from-white dark:from-zinc-950 to-transparent z-20 pointer-events-none rounded-t-[2.5rem]" />
                <div
                    ref={scrollRef}
                    className="p-10 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-[2.5rem] h-150 overflow-y-auto shadow-2xl transition-all custom-scroll"
                >
                    {units.length > 0 ? (
                        <article className="space-y-14 leading-[2.3] font-serif wrap-break-word pt-6">
                            {[...units].reverse().map((unit, index) => (
                                <div key={index} className="group relative transition-all duration-300">
                                    <div className="relative z-10 transition-transform duration-300 group-hover:translate-x-3">
                                        <RubyText content={ln(unit)} />
                                    </div>
                                    <div className="absolute -left-8 top-0 bottom-0 w-1 bg-linear-to-b from-orange-500/0 via-orange-500/40 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-full" />
                                </div>
                            ))}
                        </article>
                    ) : (
                        <div className="h-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-medium text-lg italic">
                            <p className="text-lg font-serif italic text-center leading-relaxed">
                                {emptyMessage}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};