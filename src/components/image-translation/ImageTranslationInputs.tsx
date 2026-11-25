"use client";

import { CloudUpload } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { cn } from "@/lib/utils";
import {
    IMAGE_LANGUAGES,
    IMAGE_TRANSLATION_LINKS_ENABLED,
    prepareInputSelection,
    type ImageLanguage,
    type InputSelection,
    type SourceKind,
} from "@/features/image-translation/model";
import type { ImageTranslationMessages } from "@/features/image-translation/messages";

export const panelStyle = "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5";

export const actionButton = cn(
    "inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-4 py-2",
    "font-semibold text-white transition hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2",
    "focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500",
);
export const quietButton = cn(
    "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-3 py-2",
    "text-sm font-semibold transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600",
    "disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800",
);

const fieldStyle = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900";
const inputKinds: SourceKind[] = IMAGE_TRANSLATION_LINKS_ENABLED ? ["FILES", "ZIP", "LINK"] : ["FILES", "ZIP"];

type InputProps = {
    messages: ImageTranslationMessages;
    busy: boolean;
    onSubmit: (input: InputSelection, source: ImageLanguage, target: ImageLanguage) => void;
};

/** 원본 유형과 언어를 확인한 뒤 페이지 준비에 필요한 파일과 요청을 전달한다. */
export function ImageTranslationInputs({ messages, busy, onSubmit }: InputProps) {
    const inputId = useId();
    const [kind, setKind] = useState<SourceKind>("FILES");
    const [files, setFiles] = useState<File[]>([]);
    const [link, setLink] = useState("");
    const [source, setSource] = useState<ImageLanguage>("ja");
    const [target, setTarget] = useState<ImageLanguage>("ko");
    const [error, setError] = useState<string>();
    const hint = { FILES: messages.filesHint, ZIP: messages.zipHint, LINK: messages.linkHint }[kind];

    // 입력 방식이 바뀌면 이전 입력을 무심코 다시 제출하지 않도록 지운다.
    function changeKind(next: SourceKind) {
        if (next === kind) return;
        setKind(next);
        setFiles([]);
        setLink("");
        setError(undefined);
    }

    // 같은 검증을 파일 선택과 끌어놓기 모두에 적용한다.
    function selectFiles(selection: FileList | null) {
        setFiles(Array.from(selection ?? []));
        setError(undefined);
    }

    // 화면에서 고칠 수 있는 언어·형식 오류는 작업을 만들기 전에 알려준다.
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const selection = source === target ? "languagePair" : prepareInputSelection(kind, files, link);
        if (typeof selection === "string") {
            setError(messages.inputErrors[selection]);
            return;
        }
        setError(undefined);
        onSubmit(selection, source, target);
    }

    return (
        <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
            <div className="flex flex-wrap gap-2">
                {inputKinds.map((option) => (
                    <button
                        key={option}
                        type="button"
                        disabled={busy}
                        aria-pressed={option === kind}
                        onClick={() => changeKind(option)}
                        data-testid={"image-translation-source-" + option}
                        className={cn(quietButton, option === kind && "border-blue-700 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-100")}
                    >
                        {messages.sources[option]}
                    </button>
                ))}
            </div>

            {kind === "LINK" ? (
                <label className="grid gap-2 font-semibold">
                    {messages.linkLabel}
                    <input
                        data-testid="image-translation-link"
                        type="url"
                        className={fieldStyle}
                        value={link}
                        disabled={busy}
                        maxLength={2048}
                        onChange={(event) => setLink(event.target.value)}
                        aria-describedby={inputId + "-hint"}
                    />
                </label>
            ) : (
                <label
                    className={cn(
                        "flex min-h-29 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed",
                        "border-slate-300 px-4 py-5 text-center focus-within:border-blue-600 hover:border-blue-500 dark:border-slate-600",
                    )}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                        event.preventDefault();
                        if (!busy) selectFiles(event.dataTransfer.files);
                    }}
                >
                    <CloudUpload className="size-6 text-blue-700 dark:text-blue-300" aria-hidden="true" />
                    <span className="font-semibold">{messages.filesLabel}</span>
                    {files.length > 0 && (
                        <span className="max-w-full break-all text-sm text-slate-600 dark:text-slate-300">
                            {files.length === 1 ? files[0].name : messages.included + " " + files.length}
                        </span>
                    )}
                    <input
                        key={kind}
                        data-testid="image-translation-file"
                        type="file"
                        className="sr-only"
                        accept={kind === "ZIP" ? ".zip,application/zip" : ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"}
                        multiple={kind === "FILES"}
                        disabled={busy}
                        aria-describedby={inputId + "-hint"}
                        onChange={(event) => selectFiles(event.target.files)}
                    />
                </label>
            )}
            <p id={inputId + "-hint"} className="text-sm text-slate-600 dark:text-slate-300">{hint}</p>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 font-semibold">
                    {messages.sourceLanguage}
                    <select
                        data-testid="image-translation-source-language"
                        value={source}
                        className={fieldStyle}
                        disabled={busy}
                        onChange={(event) => setSource(event.target.value as ImageLanguage)}
                    >
                        {IMAGE_LANGUAGES.map((language) => <option key={language} value={language}>{messages.languages[language]}</option>)}
                    </select>
                </label>
                <label className="grid gap-2 font-semibold">
                    {messages.targetLanguage}
                    <select
                        data-testid="image-translation-target-language"
                        value={target}
                        className={fieldStyle}
                        disabled={busy}
                        onChange={(event) => setTarget(event.target.value as ImageLanguage)}
                    >
                        {IMAGE_LANGUAGES.map((language) => <option key={language} value={language}>{messages.languages[language]}</option>)}
                    </select>
                </label>
            </div>

            {error && <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>}
            <button type="submit" data-testid="image-translation-prepare" disabled={busy} className={actionButton}>{messages.prepare}</button>
        </form>
    );
}
