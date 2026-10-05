import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const novelRoot = new URL("../../src/app/[locale]/(main)/novel/", import.meta.url);
const reader = () => null;
const catalog = () => null;
const legacyRanking = () => null;
const legacySearch = () => null;
const notFound = new Error("NEXT_NOT_FOUND");

function loadRoute(relative, { flag, platform = "syosyetu", session = { user: { role: "ADMIN" } } } = {}) {
    // 준비: 실제 route/layout을 컴파일하고 외부 프레임워크 경계만 합성한다.
    const source = fs.readFileSync(new URL(relative, novelRoot), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const modules = {
        "next/navigation": { useParams: () => ({ platformCode: platform, identifier: "n-test", episodeId: "2" }), notFound: () => { throw notFound; } },
        "next-auth": { getServerSession: async () => session },
        "@/lib/auth": { authOptions: {} },
        "react/jsx-runtime": { jsx: (type, props, key) => ({ type, props, key }) },
        "@/components/novel/NovelReaderSmartPage": { default: reader },
        "@/components/novel/NovelCatalogSmartPage": { default: catalog },
        "@/components/novel/LegacyNovelRankingSmartPage": { default: legacyRanking },
        "@/components/novel/LegacyNovelSearchSmartPage": { default: legacySearch },
    };
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        process: { env: flag === undefined ? {} : { NEXT_PUBLIC_NOVEL_READER_ENABLED: flag } },
        require: (name) => {
            assert.ok(name in modules, `Unexpected route dependency: ${name}`);
            return modules[name];
        },
    }, { filename: relative });
    return exports.default;
}

for (const flag of [undefined, "false", "true"]) {
    const label = flag ?? "absent";
    test(`reader is available to ADMIN when the retired flag is ${label}`, async () => {
        // 준비
        const page = loadRoute("[platformCode]/novels/[identifier]/episode/[episodeId]/page.tsx", { flag });
        const layout = loadRoute("layout.tsx", { flag });

        // 실행: 공개 진입 layout과 실제 page를 함께 거친다.
        const view = await layout({ children: page() });

        // 검증: 내장 reader에 회차 식별자가 그대로 전달된다.
        assert.equal(view.type, reader);
        assert.equal(view.props.platformCode, "syosyetu");
        assert.equal(view.props.novelIdentifier, "n-test");
        assert.equal(view.props.episodeIdentifier, "2");
        assert.equal(view.key, "syosyetu:n-test:2");
    });

    test(`catalog platform compatibility does not depend on retired flag ${label}`, () => {
        // 준비 / 실행 / 검증: 지원하는 두 표기는 새 catalog, 나머지는 기존 경로다.
        for (const [route, kind, legacy] of [
            ["[platformCode]/genres/[identifier]/page.tsx", "RANKING", legacyRanking],
            ["[platformCode]/search/novels/page.tsx", "SEARCH", legacySearch],
        ]) {
            for (const platform of ["syosetu", "syosyetu", "kakuyomu"]) {
                const view = loadRoute(route, { flag, platform })();
                assert.equal(view.type, platform === "kakuyomu" ? legacy : catalog);
                if (view.type === catalog) assert.equal(view.props.kind, kind);
            }
        }
    });

    test(`Novel ADMIN boundary rejects anonymous and nonADMIN when retired flag is ${label}`, async () => {
        // 준비: 사용자·익명·잘못된 role은 모두 기존 layout 정책으로 차단한다.
        for (const session of [null, { user: { role: "USER" } }, { user: { role: "GUEST" } }, { user: { role: "admin" } }]) {
            const layout = loadRoute("layout.tsx", { flag, session });

            // 실행 / 검증: reader 가용성과 권한은 독립적이며 예외를 삼키지 않는다.
            await assert.rejects(layout({ children: "protected-reader" }), (error) => error === notFound);
        }
    });
}
