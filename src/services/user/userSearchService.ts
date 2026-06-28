import { apiClient } from "@/lib/apiClient";
import type { UserSearchResult } from "@/types/social";
import { parseResponseBody } from "@/services/common/responseParser";

export const userSearchService = {
    searchByPublicId: async (publicId: string): Promise<UserSearchResult> => {
        const searchParams = new URLSearchParams({
            publicId: publicId.trim(),
        });

        const response = await apiClient(`/users/search?${searchParams.toString()}`, {
            method: "GET",
        });

        return parseResponseBody<UserSearchResult>(response, "UserSearch");
    },
};
