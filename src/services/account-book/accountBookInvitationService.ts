import { apiClient } from "@/lib/apiClient";
import { ResponseDto } from "@/types/common";
import {
    AccountBookInvitation,
    AccountBookInvitationCreateRequest,
} from "@/types/accountBook";

export const accountBookInvitationService = {
    async createInvitation(
        accountBookId: number,
        request: AccountBookInvitationCreateRequest,
    ): Promise<AccountBookInvitation> {
        const response = await apiClient(
            `/account-books/${accountBookId}/invitations`,
            {
                method: "POST",
                body: JSON.stringify(request),
            },
        );

        if (!response.ok) {
            throw new Error("Failed to create account book invitation.");
        }

        const data = (await response.json()) as ResponseDto<AccountBookInvitation>;
        return data.body;
    },

    async cancelInvitation(
        accountBookId: number,
        invitationId: number,
    ): Promise<boolean> {
        const response = await apiClient(
            `/account-books/${accountBookId}/invitations/${invitationId}`,
            {
                method: "DELETE",
            },
        );

        if (!response.ok) {
            throw new Error("Failed to cancel account book invitation.");
        }

        const data = (await response.json()) as ResponseDto<boolean>;
        return data.body;
    },

    async acceptInvitation(
        invitationId: number,
    ): Promise<AccountBookInvitation> {
        const response = await apiClient(
            `/account-book-invitations/${invitationId}/accept`,
            {
                method: "POST",
            },
        );

        if (!response.ok) {
            throw new Error("Failed to accept account book invitation.");
        }

        const data = (await response.json()) as ResponseDto<AccountBookInvitation>;
        return data.body;
    },

    async rejectInvitation(
        invitationId: number,
    ): Promise<AccountBookInvitation> {
        const response = await apiClient(
            `/account-book-invitations/${invitationId}/reject`,
            {
                method: "POST",
            },
        );

        if (!response.ok) {
            throw new Error("Failed to reject account book invitation.");
        }

        const data = (await response.json()) as ResponseDto<AccountBookInvitation>;
        return data.body;
    },

    async listPendingInvitations(
        accountBookId: number,
    ): Promise<AccountBookInvitation[]> {
        const response = await apiClient(
            `/account-books/${accountBookId}/invitations`,
            {
                method: "GET",
            },
        );

        if (!response.ok) {
            throw new Error("Failed to get account book invitations.");
        }

        const data = (await response.json()) as ResponseDto<
            AccountBookInvitation[]
        >;

        return data.body ?? [];
    },

    async listReceivedPendingInvitations(): Promise<AccountBookInvitation[]> {
        const response = await apiClient(
            "/account-book-invitations/received",
            {
                method: "GET",
            },
        );

        if (!response.ok) {
            throw new Error("Failed to get received account book invitations.");
        }

        const data = (await response.json()) as ResponseDto<
            AccountBookInvitation[]
        >;

        return data.body ?? [];
    },
};