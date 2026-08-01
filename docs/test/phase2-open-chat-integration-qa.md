# Phase 2 OPEN 채팅 실제 결합 QA

## 목적

Docs #12의 OPEN 채팅 범위를 Mock이 아닌 실제 FE·BE·DB·WebSocket 조합으로 검증한다.

이 문서는 다음 GitHub 체크 항목의 실행 근거를 남기기 위한 자료다.

- OPEN 채팅 목록 접근 및 조회
- 키워드 검색
- 상세 조회
- 참여 및 채팅방 이동
- 메시지 조회·전송
- 퇴실
- 퇴실 후 메시지 조회·전송 권한 제한
- 권한 없는 접근 차단
- OPEN 채팅 참여 흐름 완료 조건

## 자동화 시나리오

`e2e/integration/open-chat-phase2-full-flow.spec.ts`는 실제 사용자 A/B/C를 사용하여 아래 순서로 실행한다.

1. A가 PUBLIC OPEN 방을 생성한다.
2. B가 OPEN 목록에서 방 이름으로 검색하고 상세를 확인한 뒤 참여한다.
3. C가 공유 링크 형태의 상세 URL로 접근해 참여한다.
4. A/B/C가 실제 WebSocket으로 메시지를 송수신한다.
5. A가 B를 ADMIN으로 지정한다.
6. B가 C를 강제 퇴장시킨다.
7. C가 개인 WebSocket 이벤트로 차단 상세 화면으로 이동하는지 확인한다.
8. A가 방 단위 블랙리스트에서 C의 memberCode를 검색하고 차단 해제한다.
9. C가 기존 memberCode를 유지해 재참여한다.
10. C가 자발적으로 퇴실한다.
11. 퇴실한 C의 메시지 조회·전송 API가 거부되고 기본 채팅 목록에서 방이 제외되는지 확인한다.
12. 테스트 종료 시 A가 생성한 방을 종료한다.

## 사전 준비

### 1. 실제 서비스 실행

- Spring Boot BE
- Next.js FE
- 테스트 DB
- WebSocket Broker
- 프로필 이미지를 확인한다면 R2 또는 대응 Storage

### 2. E2E 환경 파일

```powershell
Copy-Item .env.e2e.example .env.e2e.local
```

`.env.e2e.local`에서 다음 값을 실제 환경에 맞게 수정한다.

```dotenv
E2E_BASE_URL=http://localhost:3000
E2E_API_BASE_URL=http://localhost:8080/api/v1
E2E_USER_A_PUBLIC_ID=...
E2E_USER_B_PUBLIC_ID=...
E2E_USER_C_PUBLIC_ID=...
```

A/B/C는 서로 다른 실제 계정이어야 한다.

### 3. 인증 상태 저장

```powershell
npm run e2e:auth
```

스크립트는 Playwright 내장 Chromium이 아니라 PC에 설치된 일반 Google Chrome을 A/B/C 순서로 연다.
각 Chrome 창에서 안내된 publicId에 맞는 Google 계정으로 직접 로그인하고, TranslaCat 화면까지 돌아온 다음 터미널에서 Enter를 누른다. Google 로그인 도중에는 Playwright가 브라우저를 제어하지 않으며, 로그인 완료 후 앱 세션만 저장한다.

Chrome 실행 파일을 자동으로 찾지 못하면 `.env.e2e.local`에 아래 값을 추가한다.

```dotenv
E2E_CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

생성 파일:

```text
playwright/.auth/user-a.json
playwright/.auth/user-b.json
playwright/.auth/user-c.json
```

해당 파일에는 인증 정보가 있으므로 Git에 Commit하지 않는다.

## 실행

OPEN 결합 QA만 실행:

```powershell
npm run test:e2e:integration:open
```

브라우저를 보면서 실행:

```powershell
npm run test:e2e:integration:open -- --headed
```

기존 FE 서버를 그대로 사용:

```powershell
$env:PLAYWRIGHT_SKIP_WEB_SERVER="1"
$env:E2E_BASE_URL="http://localhost:3000"
npm run test:e2e:integration:open
```

전체 실제 결합 E2E 실행:

```powershell
npm run test:e2e:integration
```

## 자동화 외 수동 확인

아래 항목은 실제 화면을 보며 한 번 확인한다.

| ID | 확인 항목 | 결과 |
|---|---|---|
| OPEN-MANUAL-01 | OPEN 목록·상세·채팅방이 다크모드에서 깨지지 않는다 | 미실행 |
| OPEN-MANUAL-02 | 390×844 모바일 화면에서 목록·상세·참여·방 메뉴·블랙리스트 모달이 자연스럽다 | 미실행 |
| OPEN-MANUAL-03 | PC 화면에서 메시지 영역과 모달이 잘리거나 겹치지 않는다 | 미실행 |
| OPEN-MANUAL-04 | OWNER·ADMIN·MEMBER 세 브라우저를 동시에 열었을 때 역할 Badge가 즉시 동기화된다 | 자동화 포함 / 화면 확인 권장 |
| OPEN-MANUAL-05 | 차단 대상 브라우저에서 입력창이 사라지고 BANNED 안내가 이해 가능하다 | 자동화 포함 / 문구 확인 권장 |

## 결과 기록 템플릿

```markdown
### Docs #12 OPEN 결합 QA 결과

- 실행일: YYYY-MM-DD
- FE Commit: `<commit>`
- BE Commit: `<commit>`
- 실행 환경: Local / Development
- 테스트 계정: A / B / C

#### 자동화
- `npm run test:e2e:integration:open`: PASS / FAIL
- 실행 결과: `1 passed` 또는 실패 내용

#### 수동 UI
- 다크모드: PASS / FAIL
- 모바일 390×844: PASS / FAIL
- PC 레이아웃: PASS / FAIL

#### 확인 범위
- 목록·검색·상세: PASS / FAIL
- 참여·재참여·memberCode 유지: PASS / FAIL
- 실제 WebSocket 메시지 송수신: PASS / FAIL
- OWNER→ADMIN 역할 변경: PASS / FAIL
- ADMIN 강제 퇴장: PASS / FAIL
- BANNED 즉시 복구: PASS / FAIL
- 블랙리스트 검색·해제: PASS / FAIL
- 퇴실 후 메시지 권한 제한: PASS / FAIL

#### 잔여 이슈
- 없음
- 또는 후속 이슈 링크
```

## Docs #12 체크 원칙

OPEN 결합 QA가 통과하면 Docs #12의 한국어·일본어 OPEN 채팅 시나리오와 완료 조건 중 `오픈 채팅 참여 흐름`만 체크한다.

Docs #12 전체에는 AI, 온라인 상태, Redis, 알림 검증이 남아 있으므로 이 단계에서는 이슈를 Done 또는 Close 처리하지 않는다.
