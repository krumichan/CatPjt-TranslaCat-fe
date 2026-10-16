import { defineConfig, defineDocs } from "fumadocs-mdx/config";

// 공개 사용자 가이드만 수집한다. 내부 설계·운영 문서는 이 컬렉션에 포함하지 않는다.
export const docs = defineDocs({
    dir: "content/docs",
});

export default defineConfig();
