export const accountBookListQueryKeys = {
    list: (keyword: string, category: string) =>
        ["account-books", keyword, category] as const,
    categoryOptions: () => ["account-books-category-options"] as const,
    currencies: () => ["currencies"] as const,
};
