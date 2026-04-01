import RubyText from "@/components/common/RubyText";
import {TranslationUnit} from "@/types/common";

interface Props {
    episodeIdentifier: string;
    title: TranslationUnit;
    ln: (val: TranslationUnit) => string;
}
export default function EpisodeHeader({ episodeIdentifier, title, ln }: Props) {
    return (
        <div
            className="mb-16 p-8 md:p-14 bg-[#f8f9fa] dark:bg-zinc-900/60 border border-black/5 dark:border-white/10 rounded-[2.5rem] shadow-2xl backdrop-blur-xl text-center">
                            <span
                                className="inline-block px-4 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-black tracking-widest mb-6 uppercase">
                                EPISODE {episodeIdentifier}
                            </span>
            <h1 className="text-3xl md:text-4xl font-black text-[#2D2D2D] dark:text-white leading-tight">
                <RubyText content={ln(title)}/>
            </h1>
        </div>
    );
}
