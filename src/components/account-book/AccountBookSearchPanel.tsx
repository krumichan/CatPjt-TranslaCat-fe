import { Search, WalletCards } from "lucide-react";

type AccountBookSearchPanelProps = {
    searchKeyword: string;
    totalAccountBookCount: number;
    onChangeSearchKeyword: (value: string) => void;
};

export default function AccountBookSearchPanel({
   searchKeyword,
   totalAccountBookCount,
   onChangeSearchKeyword,
}: AccountBookSearchPanelProps) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/80 dark:shadow-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        value={searchKeyword}
                        onChange={(event) => onChangeSearchKeyword(event.target.value)}
                        placeholder="가계부명, 설명, 카테고리로 검색"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-400 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                    />
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <WalletCards size={18} />
                    <span>총 {totalAccountBookCount}개 가계부</span>
                </div>
            </div>
        </div>
    );
}