import {
    expect,
    installMockAuthCookie,
    test,
} from "../fixtures/mock-test";
import {
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { TEST_USERS } from "../support/test-users";

test("홈 카드와 왼쪽 메뉴에서 각 서비스로 바로 이동한다", async ({
    page,
    context,
}) => {
    // 준비: 일반 사용자 세션과 다크 모드에서 접근 가능한 서비스를 연다.
    await installMockAuthCookie(context, "USER");
    await mockCommonPageDependencies(page, TEST_USERS.A, "USER");
    await mockIdleWebSocket(page);
    await page.addInitScript(() => {
        window.localStorage.setItem("theme", "dark");
    });

    await page.goto("/");

    // 검증: 홈은 권한에 맞는 전체 서비스와 이미지 로고를 보여준다.
    const serviceRoutes = {
        voice: "/voice",
        accountBook: "/account-books",
        chat: "/chat",
        languageLearning: "/language-learning",
        support: "/support",
    };

    for (const [service, route] of Object.entries(serviceRoutes)) {
        await expect(page.getByTestId(`service-card-${service}`)).toHaveAttribute(
            "href",
            new RegExp(`${route}$`),
        );
    }

    await expect(page.getByTestId("service-card-novel")).toHaveCount(0);
    await expect(page.getByTestId("service-card-voice")).toContainText("음성 번역");
    await expect(
        page.getByRole("link", { name: "TranslaCat", exact: true }).locator("img:visible"),
    ).toHaveAttribute("src", /translacat-wordmark-dark\.svg/);

    const backgroundColor = await page.evaluate(() =>
        getComputedStyle(document.documentElement)
            .getPropertyValue("--background")
            .trim(),
    );
    expect(backgroundColor).toBe("#0e1824");

    const supportAppearance = await page
        .getByTestId("service-card-support")
        .evaluate((card) => {
            const style = getComputedStyle(card);
            return {
                background: style.backgroundColor,
                accent: style.borderTopColor,
                accentWidth: style.borderTopWidth,
            };
        });
    expect(supportAppearance).toEqual({
        background: "rgb(25, 44, 63)",
        accent: "rgb(127, 213, 230)",
        accentWidth: "3px",
    });

    await page.screenshot({
        path: test.info().outputPath("home-dark.png"),
        animations: "disabled",
    });

    // 검증: 테마를 바꿔도 배경에 맞는 이미지 워드마크가 표시된다.
    await page.getByRole("button", { name: "Toggle Theme" }).click();
    await expect(
        page.getByRole("link", { name: "TranslaCat", exact: true }).locator("img:visible"),
    ).toHaveAttribute("src", /translacat-wordmark-light\.svg/);
    await page.screenshot({
        path: test.info().outputPath("home-light.png"),
        animations: "disabled",
    });

    // 실행·검증: 홈 카드와 사이드바 링크가 각각 서비스 화면으로 이동한다.
    await page.getByTestId("service-card-support").click();
    await expect(page).toHaveURL(/\/support$/);

    await page
        .getByTestId("app-sidebar")
        .getByRole("link", { name: "음성 번역" })
        .click();
    await expect(page).toHaveURL(/\/voice$/);
});
