import { Fragment } from "react";

import { parseFeedbackMarkdown } from "@/features/language-learning/web-ai/feedbackMarkdown";

function inlineText(text: string) {
    // 텍스트와 강조·코드만 React 노드로 만든다. AI가 반환한 HTML은 문자열 그대로 표시된다.
    return text.split(/(`[^`\n]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`")) {
            return <code key={index} className="rounded bg-slate-100 px-1 py-0.5 text-[0.9em] dark:bg-white/10">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={index} className="font-black text-slate-950 dark:text-white">{part.slice(2, -2)}</strong>;
        }
        return <Fragment key={index}>{part}</Fragment>;
    });
}

export function FeedbackMarkdown({ markdown }: { markdown: string }) {
    const blocks = parseFeedbackMarkdown(markdown);

    return (
        <div className="space-y-5 break-words text-sm leading-7 text-slate-700 dark:text-slate-200" data-testid="feedback-markdown">
            {blocks.map((block, index) => {
                switch (block.type) {
                    case "heading": {
                        const Heading = block.level <= 2 ? "h3" : "h4";
                        return <Heading key={index} className={block.level <= 2 ? "pt-3 text-xl font-black text-slate-950 dark:text-white" : "pt-2 text-base font-black text-slate-950 dark:text-white"}>{inlineText(block.text)}</Heading>;
                    }
                    case "table":
                        return (
                            <div key={index} className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                                <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-950 dark:bg-white/5 dark:text-white"><tr>{block.headers.map((cell, cellIndex) => <th key={cellIndex} scope="col" className="border-b border-slate-200 px-3 py-2 font-black dark:border-white/10">{inlineText(cell)}</th>)}</tr></thead>
                                    <tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{block.headers.map((_, cellIndex) => <td key={cellIndex} className="border-b border-slate-100 px-3 py-2 align-top last:border-b-0 dark:border-white/5">{inlineText(row[cellIndex] ?? "")}</td>)}</tr>)}</tbody>
                                </table>
                            </div>
                        );
                    case "quote":
                        return <blockquote key={index} className="whitespace-pre-wrap border-l-4 border-blue-300 pl-4 text-slate-600 dark:border-blue-400/50 dark:text-slate-300">{inlineText(block.text)}</blockquote>;
                    case "code":
                        return <pre key={index} className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-100 p-4 text-xs leading-6 dark:bg-black/20"><code>{block.text}</code></pre>;
                    case "list": {
                        const List = block.ordered ? "ol" : "ul";
                        return <List key={index} className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5`}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{inlineText(item)}</li>)}</List>;
                    }
                    case "rule":
                        return <hr key={index} className="border-slate-200 dark:border-white/10" />;
                    default:
                        return <p key={index} className="whitespace-pre-wrap">{inlineText(block.text)}</p>;
                }
            })}
        </div>
    );
}
