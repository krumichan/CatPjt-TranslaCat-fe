import { apiClient } from "@/lib/apiClient";
import { ResponseDto } from "@/types/common";
import {
    AccountBookMember,
    AccountBookMemberInviteRequest,
} from "@/types/accountBook";

export const accountBookMemberService = {
    async listMembers(accountBookId: number): Promise<AccountBookMember[]> {
        const response = await apiClient(
            `/account-books/${accountBookId}/members`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to get account book members.");
        }

        const data = (await response.json()) as ResponseDto<AccountBookMember[]>;
        return data.body ?? [];
    },

    async inviteMember(
        accountBookId: number,
        request: AccountBookMemberInviteRequest
    ): Promise<AccountBookMember> {
        const response = await apiClient(
            `/account-books/${accountBookId}/members`,
            {
                method: "POST",
                body: JSON.stringify(request),
            }
        );

        if (!response.ok) {
            throw new Error("Failed to invite account book member.");
        }

        const data = (await response.json()) as ResponseDto<AccountBookMember>;
        return data.body;
    },

    async removeMember(
        accountBookId: number,
        targetUserId: number
    ): Promise<boolean> {
        const response = await apiClient(
            `/account-books/${accountBookId}/members/${targetUserId}`,
            {
                method: "DELETE",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to remove account book member.");
        }

        const data = (await response.json()) as ResponseDto<boolean>;
        return data.body;
    },
};