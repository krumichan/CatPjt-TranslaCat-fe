"use client";

type ModalSearchStateProps = {
    title: string;
    description: string;
    variant?: "default" | "error";
};

export function FriendModalSearchState({
    title,
    description,
    variant = "default",
}: ModalSearchStateProps) {
    const isError = variant === "error";

    return (
        <div
            className={`rounded-3xl px-5 py-8 text-center ${
                isError
                    ? "border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                    : "border border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            }`}
        >
            <h3
                className={`text-lg font-black ${
                    isError
                        ? "text-rose-600 dark:text-rose-200"
                        : "text-slate-950 dark:text-white"
                }`}
            >
                {title}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6">
                {description}
            </p>
        </div>
    );
}
