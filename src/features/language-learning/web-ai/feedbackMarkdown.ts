export type FeedbackMarkdownBlock =
    | { type: "heading"; level: number; text: string }
    | { type: "paragraph" | "quote" | "code"; text: string }
    | { type: "list"; ordered: boolean; items: string[] }
    | { type: "table"; headers: string[]; rows: string[][] }
    | { type: "rule" };

function tableCells(line: string): string[] {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/)
        .map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const LIST_ITEM = /^\s*(?:(\d+)[.)]|([-*+]))\s+(.+)$/;

export function parseFeedbackMarkdown(markdown: string): FeedbackMarkdownBlock[] {
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    const blocks: FeedbackMarkdownBlock[] = [];
    let index = 0;

    // 원문은 별도로 보존한다. 렌더러에는 HTML 실행이 없는 제한된 문서 블록만 전달한다.
    while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
            index += 1;
            continue;
        }

        const fence = line.match(/^\s*(```+|~~~+)/);
        if (fence) {
            const content: string[] = [];
            index += 1;
            while (index < lines.length && !lines[index].trim().startsWith(fence[1])) {
                content.push(lines[index++]);
            }
            if (index < lines.length) index += 1;
            blocks.push({ type: "code", text: content.join("\n") });
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
            index += 1;
            continue;
        }
        if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
            blocks.push({ type: "rule" });
            index += 1;
            continue;
        }

        // 표의 구분 행이 있는 경우만 표로 해석해 일반 문장의 세로선을 보존한다.
        if (line.includes("|") && TABLE_SEPARATOR.test(lines[index + 1] ?? "")) {
            const headers = tableCells(line);
            const rows: string[][] = [];
            index += 2;
            while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
                rows.push(tableCells(lines[index++]));
            }
            blocks.push({ type: "table", headers, rows });
            continue;
        }

        const listItem = line.match(LIST_ITEM);
        if (listItem) {
            const ordered = Boolean(listItem[1]);
            const items: string[] = [];
            while (index < lines.length) {
                const item = lines[index].match(LIST_ITEM);
                if (!item || Boolean(item[1]) !== ordered) break;
                items.push(item[3]);
                index += 1;
            }
            blocks.push({ type: "list", ordered, items });
            continue;
        }

        if (/^\s*>/.test(line)) {
            const content: string[] = [];
            while (index < lines.length && /^\s*>/.test(lines[index])) {
                content.push(lines[index++].replace(/^\s*>\s?/, ""));
            }
            blocks.push({ type: "quote", text: content.join("\n") });
            continue;
        }

        const paragraph = [line];
        index += 1;
        while (index < lines.length && lines[index].trim()) {
            const next = lines[index];
            if (/^(?:#{1,6}\s|\s*>|\s*```|\s*~~~)/.test(next) ||
                LIST_ITEM.test(next) || TABLE_SEPARATOR.test(lines[index + 1] ?? "")) break;
            paragraph.push(next);
            index += 1;
        }
        blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    }

    return blocks;
}
