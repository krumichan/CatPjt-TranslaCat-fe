"use client";

export interface SpinnerProps {
    isLoading: boolean;
    size?: "sm" | "md" | "lg";
}

export default function SpinLoader({ isLoading, size = "md" }: SpinnerProps) {
    if (!isLoading) {
        return null;
    }

    return (
        <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-2xl animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-3">
                <div className={`
                    ${size === "sm" ? "w-6 h-6 border-2" : size === "lg" ? "w-16 h-16 border-4" : "w-10 h-10 border-4"} 
                    border-blue-500 border-t-transparent rounded-full animate-spin
                `}/>
            </div>
        </div>
    );
}