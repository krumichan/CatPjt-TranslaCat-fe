import { expect, test } from "../fixtures/mock-test";
import { fulfillApiJson, mockAuthenticatedSession } from "../support/api-mocks";
import { responseDto, toFriendRequest } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

async function base(page: import("@playwright/test").Page) {
    await mockAuthenticatedSession(page);
    await page.route("**/account-book-invitations/received", (route) =>
        fulfillApiJson(route, responseDto([])),
    );
    await page.route("**/recent-views**", (route) =>
        fulfillApiJson(route, responseDto([])),
    );
}

async function openInvitations(page: import("@playwright/test").Page) {
    await page.goto("/friends");
    await page.getByRole("button", { name: "알림", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
}

test.describe("Friend request notification actions", () => {
    test("FRIEND-05 받은 요청을 수락한다", async ({ page }) => {
        await base(page);
        const request = toFriendRequest({
            id: 21,
            requester: TEST_USERS.B,
            receiver: TEST_USERS.A,
        });
        await page.route("**/friends", (route) =>
            fulfillApiJson(route, responseDto([])),
        );
        await page.route("**/blocks", (route) =>
            fulfillApiJson(route, responseDto([])),
        );
        await page.route("**/friend-requests/received", (route) =>
            fulfillApiJson(route, responseDto([request])),
        );
        await page.route("**/friend-requests/sent", (route) =>
            fulfillApiJson(route, responseDto([])),
        );

        let accepted = false;
        await page.route("**/friend-requests/21/accept", (route) => {
            accepted = true;
            return fulfillApiJson(
                route,
                responseDto({ ...request, status: "ACCEPTED" }),
            );
        });

        await openInvitations(page);
        await page
            .getByRole("button", { name: "수락", exact: true })
            .click();
        await expect.poll(() => accepted).toBe(true);
    });

    test("FRIEND-06 받은 요청을 거절한다", async ({ page }) => {
        await base(page);
        const request = toFriendRequest({
            id: 22,
            requester: TEST_USERS.B,
            receiver: TEST_USERS.A,
        });
        await page.route("**/friends", (route) =>
            fulfillApiJson(route, responseDto([])),
        );
        await page.route("**/blocks", (route) =>
            fulfillApiJson(route, responseDto([])),
        );
        await page.route("**/friend-requests/received", (route) =>
            fulfillApiJson(route, responseDto([request])),
        );
        await page.route("**/friend-requests/sent", (route) =>
            fulfillApiJson(route, responseDto([])),
        );

        let rejected = false;
        await page.route("**/friend-requests/22/reject", (route) => {
            rejected = true;
            return fulfillApiJson(
                route,
                responseDto({ ...request, status: "REJECTED" }),
            );
        });

        await openInvitations(page);
        await page
            .getByRole("button", { name: "거절", exact: true })
            .click();
        await expect.poll(() => rejected).toBe(true);
    });

    test("FRIEND-07 보낸 요청을 취소한다", async ({ page }) => {
        await base(page);
        const request = toFriendRequest({
            id: 23,
            requester: TEST_USERS.A,
            receiver: TEST_USERS.B,
        });
        await page.route("**/friends", (route) =>
            fulfillApiJson(route, responseDto([])),
        );
        await page.route("**/blocks", (route) =>
            fulfillApiJson(route, responseDto([])),
        );
        await page.route("**/friend-requests/received", (route) =>
            fulfillApiJson(route, responseDto([])),
        );
        await page.route("**/friend-requests/sent", (route) =>
            fulfillApiJson(route, responseDto([request])),
        );

        let cancelled = false;
        await page.route("**/friend-requests/23/cancel", (route) => {
            cancelled = true;
            return fulfillApiJson(
                route,
                responseDto({ ...request, status: "CANCELED" }),
            );
        });

        await openInvitations(page);
        await page
            .getByRole("button", { name: "취소", exact: true })
            .click();
        await expect.poll(() => cancelled).toBe(true);
    });
});
