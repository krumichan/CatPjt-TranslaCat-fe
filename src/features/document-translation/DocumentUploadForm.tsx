"use client";

import { UploadCloud } from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";

import { useRouter } from "@/navigation";
import {
    createDocumentJob,
    DocumentRequestError,
    isUncertainDocumentMutation,
} from "@/services/document-translation/documentTranslationService";

import { documentErrorMessage, type DocumentTranslationCopy } from "./messages";
import { rememberDocumentFileName } from "./pendingDocumentFileName";
import {
    DOCUMENT_FORMATS,
    DOCUMENT_LANGUAGE_OPTIONS,
    documentJobPath,
    documentUploadError,
    type DocumentLanguage,
    type DocumentSourceLanguage,
} from "./model";
import { DOCUMENT_PANEL, DOCUMENT_PRIMARY_BUTTON } from "./styles";

const FIELD_CLASS =
    "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 disabled:opacity-60";

type Props = { loginSessionId: string; copy: DocumentTranslationCopy };

/** 선택 내용과 접수 멱등 키를 현재 화면의 메모리에서만 관리한다. */
export function DocumentUploadForm({ loginSessionId, copy }: Props) {
    const router = useRouter();
    const inputId = useId();
    const [file, setFile] = useState<File>();
    const [source, setSource] = useState<DocumentSourceLanguage>("auto");
    const [target, setTarget] = useState<DocumentLanguage | "">("");
    const [error, setError] = useState<string>();
    const [retryAt, setRetryAt] = useState<number>();
    const [uploading, setUploading] = useState(false);
    const pending = useRef<AbortController | null>(null);
    const requestKey = useRef<string | null>(null);
    const sameLanguage = target !== "" && source === target;

    useEffect(() => () => pending.current?.abort(), []);

    useEffect(() => {
        if (retryAt === undefined) {
            return;
        }
        const timer = setTimeout(() => setRetryAt(undefined), Math.max(0, retryAt - Date.now()));
        return () => clearTimeout(timer);
    }, [retryAt]);

    // 입력을 바꾸면 이전 접수 키를 새 요청에 적용하지 않는다.
    function changeSelection() {
        requestKey.current = null;
        setError(undefined);
    }

    // 드래그와 파일 선택에 같은 제약을 적용하고 파일 한 개만 유지한다.
    function chooseFiles(files: FileList | null) {
        if (!files?.length || pending.current) {
            return;
        }
        changeSelection();
        const selected = files[0];
        const invalid = files.length > 1 ? "TOO_MANY_FILES" : documentUploadError(selected);
        setError(invalid);
        setFile(invalid ? undefined : selected);
    }

    // 브라우저가 문서를 페이지 대신 열지 않게 하고 선택 규칙으로 전달한다.
    function handleDrop(event: DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        chooseFiles(event.dataTransfer.files);
    }

    // 응답을 잃은 경우 파일과 언어 조합을 그대로 두고 같은 키로만 재전송한다.
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!file || !target || sameLanguage || pending.current || retryAt !== undefined) {
            return;
        }
        const controller = new AbortController();
        pending.current = controller;
        setUploading(true);
        setError(undefined);

        try {
            const key = requestKey.current ??= crypto.randomUUID();
            const job = await createDocumentJob(
                { file, sourceLanguage: source, targetLanguage: target },
                key,
                { loginSessionId, signal: controller.signal },
            );
            controller.signal.throwIfAborted();
            rememberDocumentFileName(job.jobId, loginSessionId, file.name);
            router.push(documentJobPath(job.jobId));
        } catch (failure) {
            if (!controller.signal.aborted) {
                if (!isUncertainDocumentMutation(failure)) {
                    requestKey.current = null;
                }
                setError(failure instanceof DocumentRequestError ? failure.code : "NETWORK");
                if (failure instanceof DocumentRequestError && failure.retryAt !== undefined) {
                    setRetryAt(failure.retryAt);
                }
            }
        } finally {
            if (!controller.signal.aborted) {
                pending.current = null;
                setUploading(false);
            }
        }
    }

    return (
        <form className={DOCUMENT_PANEL + " space-y-6"} onSubmit={(event) => void submit(event)}>
            <fieldset disabled={uploading} className="space-y-6">
                <div>
                    <p className="mb-2 text-sm font-semibold">{copy.file}</p>
                    <label
                        htmlFor={inputId}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={handleDrop}
                        className="flex min-h-35 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/70 px-4 py-5 text-center font-semibold text-blue-800 hover:bg-blue-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
                    >
                        <UploadCloud className="size-6" aria-hidden="true" />
                        {copy.chooseFile}
                        <input
                            id={inputId}
                            type="file"
                            className="sr-only"
                            accept={DOCUMENT_FORMATS.map((format) => "." + format).join(",")}
                            aria-describedby={inputId + "-limit"}
                            onChange={(event) => {
                                chooseFiles(event.currentTarget.files);
                                event.currentTarget.value = "";
                            }}
                        />
                        <span id={inputId + "-limit"} className="text-xs font-normal text-slate-600 dark:text-slate-300">{copy.fileLimit}</span>
                    </label>
                    {file && (
                        <p className="mt-3 break-all text-sm text-slate-600 dark:text-slate-300" role="status">
                            <span className="font-semibold">{copy.currentFile}</span>{" · "}{file.name}
                        </p>
                    )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-semibold">
                        <span>{copy.sourceLanguage}</span>
                        <select className={FIELD_CLASS} value={source} onChange={(event) => {
                            changeSelection();
                            setSource(event.target.value as DocumentSourceLanguage);
                        }}>
                            <option value="auto">{copy.languages.auto}</option>
                            {DOCUMENT_LANGUAGE_OPTIONS.map((language) => (
                                <option key={language} value={language}>{copy.languages[language]}</option>
                            ))}
                        </select>
                    </label>
                    <label className="space-y-2 text-sm font-semibold">
                        <span>{copy.targetLanguage}</span>
                        <select className={FIELD_CLASS} value={target} onChange={(event) => {
                            changeSelection();
                            setTarget(event.target.value as DocumentLanguage | "");
                        }}>
                            <option value="">{copy.chooseLanguage}</option>
                            {DOCUMENT_LANGUAGE_OPTIONS.map((language) => (
                                <option key={language} value={language}>{copy.languages[language]}</option>
                            ))}
                        </select>
                    </label>
                </div>
            </fieldset>
            {(error || sameLanguage) && (
                <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
                    {documentErrorMessage(copy, error ?? "INVALID_LANGUAGE_PAIR")}
                </p>
            )}
            {retryAt !== undefined && <p className="text-sm text-slate-600 dark:text-slate-300">{copy.retryLater}</p>}
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={!file || !target || sameLanguage || uploading || retryAt !== undefined}
                    className={DOCUMENT_PRIMARY_BUTTON + " w-full sm:w-auto"}
                >
                    {uploading ? copy.uploading : copy.start}
                </button>
            </div>
        </form>
    );
}
