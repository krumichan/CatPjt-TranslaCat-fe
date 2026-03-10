"use client";

import {useRouter} from "@/navigation";
import FullPageLayout from "@/components/common/FullPageLayout";

interface FullPageErrorProps {
    message?: string;
    onRetry?: () => void;
    onListPath?: string;
}

export default function FullPageError({
    message = "Failed to fetch data.",
    onRetry,
    onListPath
}: FullPageErrorProps) {
    const router = useRouter();

    return (
        <FullPageLayout isError={true}>
            <div className="mt-8 text-center space-y-6 flex flex-col items-center w-full">

                <p className="text-zinc-900 dark:text-white text-2xl font-bold tracking-tight">
                    Occurred Error!
                </p>

                <p className="text-zinc-800/80 dark:text-white/90 text-sm font-medium leading-relaxed max-w-xs">
                    {message}
                </p>

                <div className="flex gap-4 justify-center items-center w-full">
                    <button
                        onClick={onRetry}
                        className="px-8 py-2.5 bg-black/5 dark:bg-white/20 hover:bg-black/10 dark:hover:bg-white/30 border border-black/10 dark:border-white/30 text-zinc-900 dark:text-white rounded-full transition-all active:scale-95 font-medium"
                    >
                        Retry
                    </button>
                    {onListPath &&
                        <button
                            onClick={() => {
                                router.push(onListPath);
                            }}
                            className="px-8 py-2.5
                            bg-zinc-950 dark:bg-white
                            hover:bg-zinc-800 dark:hover:bg-zinc-200
                            text-white dark:text-zinc-950
                            font-bold rounded-full shadow-lg
                            transition-all active:scale-95"
                        >
                            Back
                        </button>
                    }
                </div>
            </div>
        </FullPageLayout>
    );
}