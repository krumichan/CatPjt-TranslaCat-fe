import RubyText from "@/components/common/RubyText";
import {TranslationUnit} from "@/types/common";
import {Novel} from "@/types/novel";
import {useAppRouter} from "@/hooks/useAppRouter";
import {ROUTES, to} from "@/constants/routes";

interface RankingListProps {
    novels: Novel[];
    platformCode: string;
    ln: (unit: TranslationUnit) => string; // 언어 변환 함수
    showRank?: boolean;
}

export default function NovelList({ novels, platformCode, ln, showRank = false }: RankingListProps) {
    const router = useAppRouter();

    return (
        <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {novels.map((novel, index) => (
                <div
                    key={`${novel.identifier}-${index}`}
                    onClick={() => {
                        const path = novel.isShortStory
                            ? to(ROUTES.EPISODE_VIEWER, platformCode, novel.identifier, "0")
                            : to(ROUTES.NOVEL_DETAIL, platformCode, novel.identifier);
                        router.push(path);
                    }}
                    className="cursor-pointer group relative flex flex-col md:flex-row gap-6 p-6 bg-white/70 dark:bg-zinc-900/40 border border-black/5 dark:border-white/5 rounded-3xl hover:border-blue-500/50 transition-all hover:shadow-2xl hover:-translate-y-1 min-w-0"
                >
                    {/* 1. 랭킹 번호 영역 */}
                    {showRank && (
                        <div
                            className="shrink-0 w-14 h-14 flex items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-blue-700 text-white font-black text-2xl shadow-lg">
                            {novel.rank || index + 1}
                        </div>
                    )}

                    {/* 2. 소설 제목, 작가, 상태, 줄거리 영역 */}
                    <div className="flex-1 flex flex-col gap-3 min-w-0">
                        <div className="flex flex-col items-start justify-start w-full gap-2">

                            {/* 제목 */}
                            <h2 className="text-xl font-bold text-[#2D2D2D] dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                <RubyText content={ln(novel.title)}/>
                            </h2>

                            {/* 작가명 추가 */}
                            <div className="text-sm text-gray-500 dark:text-zinc-500 font-medium mb-1">
                                <span className="text-xs mr-1 opacity-70">by</span>
                                <RubyText content={ln(novel.author)}/>
                            </div>

                            {/* 상태 뱃지 */}
                            <div
                                className="inline-flex flex-col px-3 py-1.5 text-[10px] font-black rounded-xl bg-blue-100/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 uppercase tracking-widest border border-blue-200/50 dark:border-blue-800/30"
                            >
                                <RubyText content={ln(novel.status)}/>
                            </div>
                        </div>

                        {/* 줄거리 */}
                        <div className="text-gray-600 dark:text-zinc-400 text-sm leading-relaxed min-w-0 w-full">
                            <RubyText content={ln(novel.synopsis)}/>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}