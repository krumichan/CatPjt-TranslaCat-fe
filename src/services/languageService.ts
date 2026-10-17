import { apiClient } from "@/lib/apiClient";
import type { ServiceLanguage } from "@/features/languageCatalog";

export const languageService = {
    async getLanguages(): Promise<ServiceLanguage[]> {
        const response = await apiClient("/languages", { method: "GET" });
        if (!response.ok) throw new Error("LANGUAGE_CATALOG_UNAVAILABLE");
        const data = await response.json();
        if (!Array.isArray(data.body) || data.body.length === 0 || data.body.some((item: unknown) =>
            !item || typeof item !== "object" || !("code" in item) || typeof item.code !== "string" ||
            !("name" in item) || typeof item.name !== "string")) {
            throw new Error("LANGUAGE_CATALOG_INVALID");
        }
        return data.body;
    },
};
