"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Link } from "@/navigation";
import { identityErrorCode } from "@/services/identityClient";
import type { AccountAuthentication } from "@/types/auth";
import { captureDeletionReceipt, DELETION_RECEIPT_KEY, deletionCallback, newDeletionReceipt, parseDeletionStatus } from "@/features/account-deletion/contracts";
import type { DeletionReceipt, DeletionStatus } from "@/features/account-deletion/contracts";

import { deletionRequest } from "@/features/account-deletion/request";

const button = "min-h-12 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40";
const secondary = "min-h-12 rounded-xl border border-slate-300 px-5 py-3 font-bold disabled:opacity-40 dark:border-white/20";
const card = "space-y-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900";

function deletionError(code: string): string {
    if (["ACCOUNT_DELETION_UNAVAILABLE", "ACCOUNT_DELETION_SERVICES_UNAVAILABLE"].includes(code)) return "삭제 서비스 연결을 준비하고 있어요. 잠시 후 다시 시도해 주세요.";
    if (code.includes("MISMATCH")) return "삭제할 계정과 현재 로그인한 계정이 달라요. 같은 TranslaCat ID로 로그인해 주세요.";
    if (code.includes("REAUTH") || code.includes("PROOF") || code.includes("EXPIRED")) return "본인 확인이 만료됐어요. 다시 인증해 주세요.";
    if (code.includes("CREDENTIAL") || code.includes("PASSWORD")) return "비밀번호를 확인해 주세요.";
    if (code.includes("GOOGLE")) return "연결된 본인 Google 계정으로 다시 확인해 주세요.";
    if (code.includes("RATE") || code.includes("LIMIT")) return "요청이 많아요. 잠시 기다렸다가 다시 확인해 주세요.";
    return "요청 결과를 확인하지 못했어요. 자동으로 다시 보내지 않아요. 아래에서 처리 상태를 확인해 주세요.";
}

export default function AccountDeletionPage() {
    const { data: session, status: authentication } = useSession();
    const locale = useLocale();
    const query = useSearchParams();
    const [receipt, setReceipt] = useState<DeletionReceipt | null>(null);
    const [storageReady, setStorageReady] = useState(false);
    const [account, setAccount] = useState<AccountAuthentication | null>(null);
    const [proofReady, setProofReady] = useState(false);
    const [proofAccount, setProofAccount] = useState<string | null>(null);
    const [status, setStatus] = useState<DeletionStatus | null>(null);
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const mounted = useRef(true);
    const receiptRef = useRef<DeletionReceipt | null>(null);
    const receiptVersion = useRef(0);
    const [confirmForget, setConfirmForget] = useState(false);
    const owner = session?.user.publicId ?? null;
    const ownerRef = useRef(owner);
    ownerRef.current = owner;

    useEffect(() => {
        mounted.current = true;
        try {
            // 앱에서 전달한 상태 조회 증명은 어떤 로그인 redirect보다 먼저 URL에서 제거한다.
            const fragment = window.location.hash;
            if (fragment) window.history.replaceState(null, "", window.location.pathname + window.location.search);
            const restored = captureDeletionReceipt(window.sessionStorage, fragment);
            receiptRef.current = restored;
            ++receiptVersion.current;
            setReceipt(restored);
            setStorageReady(true);
        } catch (failure) {
            if (failure instanceof Error && failure.message === "DELETION_RECEIPT_CONFLICT") {
                const previous = captureDeletionReceipt(window.sessionStorage, "");
                receiptRef.current = previous;
                ++receiptVersion.current;
                setReceipt(previous); setStorageReady(true);
                setError("이 탭에는 이미 전송한 다른 삭제 요청의 영수증이 있어요. 먼저 처리 상태를 확인하거나 아래에서 기존 영수증을 명시적으로 지운 뒤 앱에서 다시 열어 주세요.");
            } else {
                setError("이 브라우저에서 삭제 영수증을 안전하게 보관하지 못했어요. 저장소를 허용한 뒤 다시 열어 주세요.");
            }
        }
        return () => { mounted.current = false; };
    }, []);

    useEffect(() => {
        if (!owner || authentication !== "authenticated") return;
        let active = true;
        void Promise.all([
            deletionRequest<AccountAuthentication>("/api/account/details"),
            deletionRequest<{ ready: boolean }>("/api/account-deletion/proof/status", {}),
        ]).then(([details, proof]) => {
            if (!active || ownerRef.current !== owner) return;
            setAccount(details);
            setProofAccount(owner);
            setProofReady(proof.ready === true);
        }).catch(() => { if (active) setError("계정 확인 정보를 불러오지 못했어요. 다시 로그인해 주세요."); });
        return () => { active = false; };
    }, [owner, authentication]);

    const saveReceipt = (next: DeletionReceipt) => {
        window.sessionStorage.setItem(DELETION_RECEIPT_KEY, JSON.stringify(next));
        if (receiptRef.current?.operationId !== next.operationId) ++receiptVersion.current;
        receiptRef.current = next;
        setReceipt(next);
    };
    const checkStatus = useCallback(async (target: DeletionReceipt) => {
        const version = receiptVersion.current;
        const result = parseDeletionStatus(await deletionRequest("/api/account-deletion/status", {
            operationId: target.operationId, receiptSecret: target.receiptSecret,
        }), target.operationId);
        if (!mounted.current || receiptVersion.current !== version
            || receiptRef.current?.operationId !== target.operationId) return;
        setStatus(result);
        setError(null);
        // 삭제 접수 확인 뒤에만 현재 웹 세션을 지운다. 네트워크 오류를 접수 성공으로 추측하지 않는다.
        if (ownerRef.current === target.expectedPublicId) await signOut({ redirect: false });
    }, []);

    useEffect(() => {
        if (!receipt?.submitted || status?.status === "COMPLETED") return;
        let active = true;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const poll = async () => {
            if (document.visibilityState !== "visible") { timer = setTimeout(poll, 15000); return; }
            try { await checkStatus(receipt); }
            catch { /* 응답 유실 뒤 404/일시 장애는 접수 여부 미확정으로 남기고 원문은 표시하지 않는다. */ }
            if (active) timer = setTimeout(poll, 15000);
        };
        void poll();
        return () => { active = false; clearTimeout(timer); };
    }, [receipt, status?.status, checkStatus]);

    const identify = async (google: boolean) => {
        if (!owner || busy) return;
        const expected = owner;
        setBusy(true); setError(null);
        try {
            if (!receipt) saveReceipt(newDeletionReceipt(expected));
            if (google) {
                await deletionRequest("/api/account-deletion/proof/google/start", { locale });
                if (ownerRef.current !== expected || !mounted.current) return;
                await signIn("google", { callbackUrl: `/${locale}/account-deletion` });
            } else {
                await deletionRequest("/api/account-deletion/proof/password", { password });
                if (ownerRef.current === expected && mounted.current) { setProofReady(true); setProofAccount(expected); }
            }
        } catch (failure) {
            if (mounted.current) setError(deletionError(identityErrorCode(failure)));
        } finally {
            if (mounted.current) { setPassword(""); setBusy(false); }
        }
    };

    const submit = async () => {
        if (!receipt || busy || !owner || receipt.expectedPublicId !== owner || !agreed
            || confirmation !== owner || !proofReady || proofAccount !== owner) return;
        const version = receiptVersion.current;
        const targetOwner = owner;
        setBusy(true); setError(null);
        try {
            // 세션이 즉시 폐기되거나 응답이 유실되어도 조회할 수 있도록 증명을 먼저 보존한다.
            const submitted = { ...receipt, submitted: true };
            saveReceipt(submitted);
            const result = await deletionRequest("/api/account-deletion/request", { ...submitted, confirmation: "DELETE_ACCOUNT" });
            const accepted = parseDeletionStatus(result, receipt.operationId);
            if (!mounted.current || receiptVersion.current !== version
                || receiptRef.current?.operationId !== receipt.operationId) return;
            setStatus(accepted);
            setProofReady(false);
            setConfirmation("");
            if (ownerRef.current === targetOwner) await signOut({ redirect: false });
        } catch (failure) {
            if (mounted.current && receiptVersion.current === version) {
                const code = identityErrorCode(failure);
                setProofReady(false);
                setError(deletionError(code));
                // 서버가 접수 전 거절을 명확히 돌려준 경우에만 같은 영수증으로 본인 확인부터 다시 시작한다.
                if (["ACCOUNT_DELETION_UNAVAILABLE", "ACCOUNT_DELETION_SERVICES_UNAVAILABLE", "ACCOUNT_DELETION_ACCOUNT_MISMATCH",
                    "REAUTHENTICATION_REQUIRED", "AUTH_PROOF_INVALID_OR_EXPIRED", "ACCOUNT_DELETION_INVALID_INPUT"].includes(code)) {
                    saveReceipt({ ...receipt, submitted: false });
                }
            }
        } finally {
            if (mounted.current) setBusy(false);
        }
    };
    const manualStatus = async () => {
        if (!receipt || busy) return;
        setBusy(true); setMessage(null);
        try { await checkStatus(receipt); }
        catch { setMessage("아직 접수 상태를 확인하지 못했어요. 연결을 확인하고 잠시 후 다시 눌러 주세요. 삭제 요청은 다시 전송하지 않았어요."); }
        finally { if (mounted.current) setBusy(false); }
    };
    const forgetReceipt = async () => {
        if (busy) return;
        setBusy(true);
        try {
            // 기기 조회 정보만 제거한다. 접수된 서버 작업은 취소·재전송하지 않는다.
            window.sessionStorage.removeItem(DELETION_RECEIPT_KEY);
            ++receiptVersion.current;
            receiptRef.current = null;
            setReceipt(null); setStatus(null); setProofReady(false); setProofAccount(null);
            setPassword(""); setConfirmation(""); setAgreed(false); setError(null);
            setConfirmForget(false); setStorageReady(true);
            setMessage("이 탭의 영수증을 지웠어요. 이미 접수한 삭제 처리는 계속 진행돼요.");
            await deletionRequest("/api/account-deletion/proof/cancel", {}).catch(() => undefined);
        } catch {
            setError("이 탭의 영수증을 지우지 못했어요. 브라우저 저장소를 확인해 주세요.");
        } finally { if (mounted.current) setBusy(false); }
    };
    const callback = receipt && status ? deletionCallback(receipt) : null;
    const sameAccount = !receipt || receipt.expectedPublicId === owner;
    const googleResult = query.get("google");

    return <main className="mx-auto max-w-2xl space-y-6 px-4 py-12 text-slate-800 dark:text-slate-100">
        <p className="font-black text-orange-500">TranslaCat</p>
        <h1 className="text-3xl font-black">계정 탈퇴 및 데이터 삭제</h1>
        <section className={card}>
            <h2 className="text-xl font-bold">삭제되는 정보와 남는 공동 기록</h2>
            <ul className="list-disc space-y-3 pl-5 text-sm leading-7">
                <li>프로필·연결 계정·친구·차단 관계·기기 연결·개인 문의·개인 학습 기록과 개인 가계부를 삭제해요. 저장된 개인 음성 파일도 삭제해요.</li>
                <li>공유 채팅의 메시지와 번역 본문은 유지하고 작성자를 ‘탈퇴한 사용자’로 바꿔요. 내 이름·프로필·TranslaCat ID는 더 이상 표시하지 않아요.</li>
                <li>함께 쓰는 가계부는 다른 참여자에게 소유권을 넘기고 공동 내역을 유지해요. 내 표시는 익명으로 바꿔요.</li>
                <li>운영자만 보는 신고 증거는 신고 접수 후 90일 동안 보관한 뒤 자동 삭제해요. 증거가 삭제된 뒤에는 개인정보 없는 처리 기록만 남아요.</li>
                <li>접수되면 모든 기기의 로그인을 종료하고 되돌릴 수 없어요. 여러 서비스와 파일 정리가 끝나기 전에는 ‘삭제 처리 중’으로 표시해요.</li>
                <li>완료 후 7일 동안 이 브라우저·앱에 보관한 영수증으로 처리 상태를 확인할 수 있어요. 완료 여부를 확인할 때까지 앱 데이터나 이 탭의 저장소를 지우지 말아 주세요.</li>
            </ul>
        </section>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
        {googleResult && googleResult !== "reauthenticated" && <p role="alert">{deletionError(googleResult)}</p>}
        {message && <p role="status">{message}</p>}
        {status ? <section className={card}>
            <h2 className="text-xl font-bold">{status.status === "COMPLETED" ? "데이터 삭제가 완료됐어요" : "삭제 처리 중이에요"}</h2>
            <p className="text-sm leading-7">{status.status === "PENDING" ? "계정 접근을 종료했어요. 각 서비스의 기록과 실제 파일을 정리하고 있어요. 이 화면에서 상태를 다시 확인할 수 있어요." : "삭제와 익명화를 마쳤어요. 위에서 안내한 공동 기록과 제한된 신고 증거 정책은 계속 적용돼요."}</p>
            <p className="break-all text-xs text-slate-500">접수 번호: {status.operationId}</p>
            {status.status === "PENDING" && <button className={secondary} disabled={busy} onClick={() => void manualStatus()}>처리 상태 새로고침</button>}
            {callback && <a className={button + " inline-flex items-center"} href={callback}>앱으로 돌아가기</a>}
        </section> : <section className={card}>
            {receipt?.submitted && <div className="space-y-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <p>삭제 요청을 전송한 기록이 있어요. 접수 결과가 확인되기 전에는 다시 보내지 않아요.</p>
                <button className={secondary} disabled={busy} onClick={() => void manualStatus()}>접수·삭제 처리 상태 확인</button>
            </div>}
            {authentication === "loading" && <p role="status">로그인 상태를 확인하고 있어요…</p>}
            {authentication === "unauthenticated" && !receipt?.submitted && <>
                <p>삭제할 TranslaCat 계정으로 로그인해 주세요.</p>
                <button className={button} disabled={!storageReady || busy} onClick={() => {
                    setBusy(true);
                    void deletionRequest("/api/account/google/cancel", {}).then(() => signIn(undefined, { callbackUrl: `/${locale}/account-deletion` })).catch(() => { setBusy(false); setError("로그인 화면을 열지 못했어요."); });
                }}>로그인하고 계속</button>
            </>}
            {authentication === "authenticated" && !receipt?.submitted && <>
                <p className="break-all font-bold">현재 TranslaCat ID: {owner}</p>
                {!sameAccount ? <div className="space-y-3">
                    <p role="alert">앱에서 선택한 계정({receipt?.expectedPublicId})과 달라요. 같은 계정으로 다시 로그인해 주세요.</p>
                    <button className={secondary} disabled={busy} onClick={() => {
                        setBusy(true);
                        void deletionRequest("/api/account-deletion/proof/cancel", {})
                            .then(() => signOut({ callbackUrl: `/${locale}/account-deletion` }))
                            .catch(() => { setBusy(false); setError("계정 전환을 시작하지 못했어요. 다시 눌러 주세요."); });
                    }}>로그아웃하고 계정 바꾸기</button>
                </div> : <>
                    <h2 className="text-xl font-bold">본인 확인</h2>
                    {account?.googleLinked && <button className={secondary} disabled={busy || !storageReady} onClick={() => void identify(true)}>Google 계정으로 다시 확인</button>}
                    {account?.hasPassword && <form onSubmit={event => { event.preventDefault(); void identify(false); }} className="space-y-3">
                        <label className="block space-y-2"><span>현재 비밀번호</span><input type="password" autoComplete="current-password" maxLength={256} value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-transparent p-3" disabled={busy} /></label>
                        <button className={secondary} disabled={busy || !password || !storageReady}>비밀번호로 본인 확인</button>
                    </form>}
                    {proofReady && proofAccount === owner && <p role="status">본인 확인을 마쳤어요. 5분 안에 최종 확인을 진행해 주세요.</p>}
                    <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={agreed} disabled={busy} onChange={event => setAgreed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" /><span>위 삭제·보존 내용을 확인했고, 이 계정을 탈퇴하며 데이터 삭제를 요청할게요.</span></label>
                    <label className="block space-y-2 text-sm"><span>확인을 위해 내 TranslaCat ID를 입력해 주세요.</span><input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} disabled={busy} className="w-full rounded-xl border border-slate-300 bg-transparent p-3" /></label>
                    <button className="min-h-12 w-full rounded-xl bg-red-700 px-5 py-3 font-bold text-white disabled:opacity-40" disabled={busy || !agreed || !owner || confirmation !== owner || !receipt || !proofReady || proofAccount !== owner || !storageReady} onClick={() => void submit()}>{busy ? "처리 중…" : "계정 탈퇴하고 데이터 삭제 요청"}</button>
                </>}
            </>}
        </section>}
        {(receipt || !storageReady) && <section className={card}>
            {!confirmForget ? <button className={secondary} disabled={busy} onClick={() => setConfirmForget(true)}>이 탭의 영수증 지우기</button> : <>
                <p className="text-sm leading-7">이 탭에서 처리 상태를 확인할 정보만 지워요. 이미 접수한 탈퇴는 취소되지 않고 계속 진행돼요. 아직 완료를 확인하지 못했다면 영수증을 남겨 두세요.</p>
                <div className="flex flex-wrap gap-3">
                    <button className={secondary} disabled={busy} onClick={() => setConfirmForget(false)}>영수증 남겨 두기</button>
                    <button className={secondary} disabled={busy} onClick={() => void forgetReceipt()}>확인했어요 · 탭 영수증만 지우기</button>
                </div>
            </>}
        </section>}
        <Link href="/settings/account" className="inline-block py-3 text-sm underline">계정 설정으로</Link>
    </main>;
}
