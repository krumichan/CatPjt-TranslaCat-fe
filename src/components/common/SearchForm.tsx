"use client";

import React, {useEffect} from "react";
import RubyText from "@/components/common/RubyText";

interface SearchFormProps {
    title: string;
    placeholder: string;
    buttonText: string;
    defaultValue?: string;
    onSearch: (query: string) => void;
}

export default function SearchForm({
    title,
    placeholder,
    buttonText,
    defaultValue = "",
    onSearch
}: SearchFormProps) {
    const [query, setQuery] = React.useState(defaultValue);

    useEffect(() => {
        setQuery(defaultValue);
    }, [defaultValue]);

    const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center w-full">
            {title && (
                <h3 className="text-xl font-bold text-[#2D2D2D] dark:text-white transition-colors">
                    <RubyText content={title}/>
                </h3>
            )}

            <div className="relative w-full max-w-xl group">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full p-4 pr-24 rounded-2xl
                        bg-white/80 dark:bg-white/10
                        border border-gray-200 dark:border-white/20
                        text-[#2D2D2D] dark:text-white
                        placeholder-gray-400 dark:placeholder-gray-500
                        focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20
                        focus:border-blue-500 dark:focus:border-blue-400
                        outline-none transition-all shadow-sm group-hover:shadow-md
                        backdrop-blur-sm"
                />
                <button
                    type="submit"
                    className="absolute right-2 top-2 bottom-2 px-6
                        bg-blue-600 dark:bg-blue-500
                        text-white rounded-xl font-bold
                        hover:bg-blue-500 dark:hover:bg-blue-400
                        active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                >
                    {buttonText}
                </button>
            </div>
        </form>
    );
}