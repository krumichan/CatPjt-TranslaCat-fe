import { useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export function useAccountBookListFilters() {
    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    const debouncedSearchKeyword = useDebouncedValue(searchKeyword, 300);

    return {
        searchKeyword,
        debouncedSearchKeyword,
        selectedCategory,
        setSearchKeyword,
        setSelectedCategory,
    };
}
