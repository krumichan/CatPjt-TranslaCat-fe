import { AccountBook, AccountBookCategoryGroup } from "@/types/accountBook";

export function groupAccountBooksByCategory(
    accountBooks: AccountBook[],
    fallbackCategoryName: string
): AccountBookCategoryGroup[] {
    const categoryMap = new Map<string, AccountBook[]>();

    accountBooks.forEach((accountBook) => {
        const categoryName = accountBook.category || fallbackCategoryName;
        const currentItems = categoryMap.get(categoryName) ?? [];

        categoryMap.set(categoryName, [...currentItems, accountBook]);
    });

    return Array.from(categoryMap.entries()).map(([categoryName, items]) => ({
        id: categoryName,
        name: categoryName,
        accountBooks: items,
    }));
}

export function getAccountBookCategoryOptions(
    accountBooks: AccountBook[],
    fallbackCategoryName: string
): string[] {
    const categories = accountBooks.map(
        (accountBook) => accountBook.category || fallbackCategoryName
    );

    return Array.from(new Set(categories)).filter(Boolean);
}
