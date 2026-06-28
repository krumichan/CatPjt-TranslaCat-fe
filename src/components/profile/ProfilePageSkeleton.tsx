export default function ProfilePageSkeleton() {
    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-4xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="mx-auto h-28 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
                <div className="mx-auto mt-6 h-4 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
                <div className="mx-auto mt-4 h-8 w-48 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
                <div className="mx-auto mt-4 h-16 w-full max-w-sm animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
                <div className="mt-8 h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
                <div className="mt-4 h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
            </div>

            <div className="rounded-4xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
                <div className="mt-4 h-8 w-56 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
                <div className="mt-4 h-12 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
                <div className="mt-8 h-14 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
                <div className="mt-5 h-14 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
                <div className="mt-5 h-32 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
                <div className="mt-6 flex justify-end gap-3">
                    <div className="h-12 w-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
                    <div className="h-12 w-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
                </div>
            </div>
        </div>
    );
}
