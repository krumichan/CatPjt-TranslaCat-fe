import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const readRepositoryFile = (relativePath) =>
    readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

test("receipt review mode is injected into the production Next build", () => {
    // 준비: README에 공개한 현재 릴리스 기본값과 빌드 주입 순서를 확인한다.
    const dockerfile = readRepositoryFile("Dockerfile");

    // 검증: 검토 보조 모드를 기본 활성화하며 Next 컴파일 전에 값을 공급한다.
    assert.match(dockerfile, /^ARG NEXT_PUBLIC_RECEIPT_REVIEW_ASSISTED=true$/m);
    assert.match(
        dockerfile,
        /^ENV NEXT_PUBLIC_RECEIPT_REVIEW_ASSISTED=\$NEXT_PUBLIC_RECEIPT_REVIEW_ASSISTED$/m,
    );
    assert.ok(
        dockerfile.indexOf("ENV NEXT_PUBLIC_RECEIPT_REVIEW_ASSISTED=") <
        dockerfile.indexOf("RUN npm run build"),
        `${repositoryRoot}: the public receipt flag must be present before next build`,
    );
});

test("live launcher can use a production build and keeps private traces opt-in", () => {
    const launcher = readRepositoryFile("scripts/start-receipt-live-stack.ps1");

    assert.match(launcher, /\[switch\]\$ProductionFrontend/);
    assert.match(launcher, /\[switch\]\$EnablePrivateReceiptTrace/);
    assert.match(launcher, /if \(\$ProductionFrontend\)[\s\S]*& \$npm run build[\s\S]*'run', 'start'/);
    assert.match(
        launcher,
        /if \(\$EnablePrivateReceiptTrace\)[\s\S]*RECEIPT_DEBUG_TRACE_DIR[\s\S]*Remove-Item Env:RECEIPT_DEBUG_TRACE_DIR/,
    );
});
