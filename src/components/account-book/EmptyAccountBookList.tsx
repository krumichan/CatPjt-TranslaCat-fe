export default function EmptyAccountBookList() {
    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/95 p-10 text-center shadow-[0_12px_30px_rgba(15,23,42,0.10)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80">
            <p className="text-base font-semibold">검색 결과가 없습니다.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                다른 키워드로 검색하거나 신규 가계부를 작성해 주세요.
            </p>
        </div>
    );
}