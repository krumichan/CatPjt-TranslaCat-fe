export type RubyNode = string | { tag: "ruby" | "rb" | "rt" | "rp" | "br"; children: RubyNode[] };

function decodeEntities(value: string): string {
    return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, name: string) => {
        const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
        if (!name.startsWith("#")) return named[name.toLowerCase()] ?? match;
        const code = name[1].toLowerCase() === "x" ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1));
        return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : match;
    });
}

export function parseRuby(value: string): RubyNode[] {
    // 속성 없는 ruby 태그만 구조로 변환한다. 나머지 HTML처럼 보이는 원문은 React 텍스트로 남긴다.
    const root: RubyNode[] = [];
    const stack: { tag: string; children: RubyNode[] }[] = [{ tag: "root", children: root }];
    const tokens = value.split(/(<\/?(?:ruby|rb|rt|rp)>|<br\s*\/?>)/g);
    for (const token of tokens) {
        if (!token) continue;
        const tag = /^<(ruby|rb|rt|rp)>$/.exec(token)?.[1];
        const closing = /^<\/(ruby|rb|rt|rp)>$/.exec(token)?.[1];
        const parent = stack[stack.length - 1];
        if (tag && stack.length < 16) {
            const node = { tag: tag as "ruby" | "rb" | "rt" | "rp", children: [] as RubyNode[] };
            parent.children.push(node);
            stack.push(node);
        } else if (closing && parent.tag === closing) {
            stack.pop();
        } else if (/^<br\s*\/?>$/.test(token)) {
            parent.children.push({ tag: "br", children: [] });
        } else {
            parent.children.push(decodeEntities(token));
        }
    }
    return root;
}

export function rubyPlainText(value: string): string {
    const flatten = (nodes: RubyNode[]): string => nodes.map(node => {
        if (typeof node === "string") return node;
        if (node.tag === "rt" || node.tag === "rp") return "";
        return node.tag === "br" ? "\n" : flatten(node.children);
    }).join("");
    return flatten(parseRuby(value));
}
