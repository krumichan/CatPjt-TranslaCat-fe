type RankingChartMessageCardProps = {
    title: string;
    message: string;
};

export default function RankingChartMessageCard({
    title,
    message,
}: RankingChartMessageCardProps) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/90 dark:shadow-black/30">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {title}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {message}
            </p>
        </section>
    );
}