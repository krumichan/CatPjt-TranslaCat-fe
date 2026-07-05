# TranslaCat Playwright E2E 테스트 매뉴얼

TranslaCat FE의 Playwright 기반 E2E 테스트 실행 방법을 정리한 문서입니다.

현재 E2E 테스트는 크게 두 종류로 구성됩니다.

- **Mock E2E**: 실제 BE/DB 상태에 의존하지 않고 FE 기능과 화면 흐름을 검증합니다.
- **Real Integration E2E**: 실제 A/B/C 사용자 계정, 실제 BE API, 실제 친구 관계와 채팅 흐름을 검증합니다.

---

## 1. 테스트 구성

### Mock E2E

현재 Mock E2E는 총 54개 테스트로 구성되어 있습니다.

주요 검증 범위:

- 프로필 조회/수정/validation/재시도
- Public ID 사용자 검색
- 친구 요청 전송/수락/거절/취소
- 친구 목록/검색 필터/Empty State
- 친구 삭제
- 차단/차단 해제
- FRIEND DIRECT 채팅방 생성 또는 조회
- FRIEND GROUP 멤버 선택 및 생성
- MANUAL/FREIND DIRECT/GROUP 채팅방 표시
- Phase 1 → Phase 1.5 전환 회귀 검증
- 메시지 초기 조회
- Cursor 기반 과거 메시지 추가 조회
- 메시지 중복 제거
- REST fallback 메시지 전송
- WebSocket/STOMP 연결/수신/SEND frame
- 번역 COMPLETED/PENDING/FAILED 상태
- 번역 완료 이벤트 반영
- 채팅 언어 설정 조회/저장/실패 처리
- ko/ja i18n regression
- Smoke test

실행 명령:

```powershell
npm run test:e2e
```

정상 결과 예시:

```text
54 passed
```

---

## 2. 최초 준비

### 2.1 의존성 설치

```powershell
npm install
```

### 2.2 Playwright 브라우저 설치

최초 1회 또는 Playwright 버전 변경 후 필요할 수 있습니다.

```powershell
npx playwright install chromium
```

전체 브라우저가 필요한 경우:

```powershell
npx playwright install
```

---

## 3. E2E 환경변수

프로젝트 루트에 `.env.e2e.local` 파일을 준비합니다.

예시:

```env
# FE URL
E2E_BASE_URL=http://localhost:3000

# Real Integration 전용 BE API base URL
E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1

# 실제 테스트 계정 Public ID
E2E_USER_A_PUBLIC_ID=TC-H6VR-9KQD
E2E_USER_B_PUBLIC_ID=TC-PFSN-CLNA
E2E_USER_C_PUBLIC_ID=TC-3567-W4EZ

# Real Integration 실행 시에만 사용
# E2E_REAL=1

# A/B/C 사이 친구 요청, 친구 관계, 차단 관계를
# 테스트 전후로 정리할 때만 1
# 실제 계정 상태를 변경하므로 전용 테스트 계정에서만 사용 권장
# E2E_RESET_STATE=1

# FE 서버를 별도로 실행한 상태에서
# Playwright가 webServer를 직접 실행하지 않도록 할 때 사용
# PLAYWRIGHT_SKIP_WEB_SERVER=1
```

> `.env.e2e.local`에는 인증 정보나 비밀값이 포함될 수 있으므로 Git 관리 여부를 반드시 확인합니다.

---

## 4. Mock E2E 실행

### 권장 방식: FE 서버를 먼저 안정적으로 실행

현재 Windows 환경에서 Next.js 16.1.1 Turbopack의 route compile panic이 발생한 이력이 있고,
Webpack cold build도 시간이 오래 걸릴 수 있습니다.

따라서 E2E에서는 다음 흐름을 권장합니다.

### 4.1 Production build

```powershell
npx next build --webpack
```

Cold build는 환경에 따라 오래 걸릴 수 있습니다.

실제 확인된 환경에서는 최초 전체 Webpack build가 약 8분 소요되었지만 정상 완료되었습니다.

빌드 중 다음 메시지에서 오래 머물러도 CPU 사용량이 계속 증가하고 있다면 실제 컴파일이 진행 중일 수 있습니다.

```text
Creating an optimized production build ...
```

빌드 성공 예시:

```text
Compiled successfully
Finished TypeScript
Collecting page data
Generating static pages
Collecting build traces
Finalizing page optimization
```

### 4.2 FE production server 실행

PowerShell 창 1:

```powershell
npm run start -- --hostname localhost --port 3000
```

### 4.3 Mock E2E 실행

PowerShell 창 2:

```powershell
npm run test:e2e
```

기존 FE 서버를 재사용하지 않고 Playwright 설정의 `webServer`를 사용할 수도 있지만,
현재 프로젝트의 Windows 개발 환경에서는 production build + `next start` 조합이 가장 안정적으로 확인되었습니다.

---

## 5. Mock E2E 실패 시 확인 순서

### 5.1 전체 결과 확인

```text
50 passed
4 failed
```

처럼 일부 테스트만 실패했다면 전체 서버 문제로 단정하지 않습니다.

먼저 실패 유형을 구분합니다.

#### Locator 문제

예:

```text
strict mode violation
resolved to 2 elements
```

동일한 이름의 요소가 여러 개 존재한다는 뜻입니다.

대응:

- `section`, `article`, `dialog` 등 상위 영역으로 locator 범위를 제한
- `filter({ hasText: ... })` 사용
- 테스트 의도가 명확한 경우에만 `.first()` 또는 `.nth()` 사용

#### URL 이동 후 `/login` 또는 `/api/auth/signout`으로 이동

예:

```text
Expected: /chat/rooms/901
Received: /login?callbackUrl=...
```

또는:

```text
/api/auth/signout?csrf=true
```

가능성이 높은 원인:

- 목적지 페이지가 호출하는 API가 Mock되지 않음
- 실제 BE 호출이 발생
- 401 처리
- FE 공통 인증 로직이 `signOut()` 실행

대응:

- 목적지 채팅방의 room detail API Mock 추가
- message list API Mock 추가
- language setting API Mock 추가
- 테스트 정책에 맞게 WebSocket Mock 추가

#### 거의 정확히 60초마다 실패

예:

```text
59.6s
59.8s
1.0m
```

일반적인 기능 처리 시간이 아니라 테스트 timeout에 도달했을 가능성이 큽니다.

서버 로그에서 다음을 확인합니다.

```text
Compiling ...
```

또는:

```text
FATAL: An unexpected Turbopack error occurred
```

---

## 6. HTML Report 확인

테스트 후 HTML report를 확인할 수 있습니다.

```powershell
npx playwright show-report
```

실패 원인을 빠르게 볼 때 유용합니다.

확인할 항목:

- 실패한 assertion
- 실제 URL
- locator strict mode 오류
- screenshot
- video
- trace 연결 정보

---

## 7. Trace 확인

실패 결과에 다음과 같은 명령이 표시될 수 있습니다.

```powershell
npx playwright show-trace test-results\<실패 테스트 경로>\trace.zip
```

Trace Viewer에서 확인할 수 있는 내용:

- 페이지 이동 흐름
- 클릭/입력 이벤트
- 요청/응답
- 콘솔 로그
- DOM snapshot
- assertion 전후 상태

특히 다음 문제에 유용합니다.

- 클릭 후 예상 URL로 가지 않는 문제
- API Mock route가 매칭되지 않는 문제
- 로그인 페이지로 리다이렉트되는 문제
- 버튼이 실제로 클릭 가능한 상태였는지 확인
- 비동기 race condition 확인

---

## 8. Real Integration E2E 개요

Real Integration E2E는 Mock이 아니라 실제 시스템 흐름을 검증합니다.

현재 기본 전체 흐름:

1. A가 B를 Public ID로 검색
2. A가 B에게 친구 요청
3. B가 알림 센터에서 요청 수락
4. A/B 친구 목록에 서로 표시
5. A가 B와 FRIEND DIRECT 채팅 시작
6. A가 메시지 전송
7. B가 실제 메시지 수신
8. A와 C도 친구 관계 생성
9. A가 B/C FRIEND GROUP 생성
10. A가 그룹 메시지 전송
11. B/C가 실제 메시지 수신
12. A가 C를 차단
13. C가 A 친구 목록에서 제거되는지 확인

실행:

```powershell
npm run test:e2e:integration
```

---

## 9. Real Integration 사전 조건

Real Integration 실행 전에 다음이 준비되어야 합니다.

### FE

```text
http://localhost:3000
```

### BE

```text
http://127.0.0.1:8080
```

API base:

```text
http://127.0.0.1:8080/api/v1
```

### 실제 사용자 인증 상태

사용자 A/B/C의 인증 상태 파일이 필요합니다.

```text
playwright/.auth/user-a.json
playwright/.auth/user-b.json
playwright/.auth/user-c.json
```

각 파일은 각 테스트 계정의 실제 로그인 상태를 저장합니다.

---

## 10. A/B/C 인증 상태 준비

인증 상태가 없거나 만료되었을 때 실행합니다.

```powershell
npm run e2e:auth
```

인증 도구는 설치된 Google Chrome과 별도 인증 프로필을 이용합니다.

프로필 경로:

```text
playwright/.chrome-auth/user-a/
playwright/.chrome-auth/user-b/
playwright/.chrome-auth/user-c/
```

인증 결과:

```text
playwright/.auth/user-a.json
playwright/.auth/user-b.json
playwright/.auth/user-c.json
```

Integration 실행 중 다음 오류가 발생하면 인증 상태를 다시 생성합니다.

```text
Stored auth state does not contain a valid accessToken.
Run npm run e2e:auth again.
```

---

## 11. Real Integration 관계 초기화

환경변수:

```env
E2E_RESET_STATE=1
```

을 활성화하면 Integration 시작 전과 종료 후 A/B/C 사이의 관계를 정리합니다.

대상:

- PENDING 친구 요청
- 친구 관계
- 차단 관계

주의:

> 이 기능은 실제 데이터를 변경합니다. A/B/C가 전용 E2E 테스트 계정일 때 사용하는 것을 권장합니다.

테스트 도중 실패하면 `finally` 단계에서 정리를 다시 시도합니다.

단, 프로세스 강제 종료나 BE 장애 등으로 cleanup이 완료되지 않을 수도 있으므로,
다음 실행 전에 실제 관계 상태를 확인해야 할 수 있습니다.

---

## 12. Real Integration API URL 주의사항

`APIRequestContext`의 `baseURL`을 사용할 때 URL 결합 방식에 주의합니다.

권장:

```ts
baseURL: "http://127.0.0.1:8080/api/v1/"
```

요청:

```ts
api.get("users/me/profile");
```

주의할 형태:

```ts
api.get("/users/me/profile");
```

요청 경로가 `/`로 시작하면 base URL의 `/api/v1` 경로가 제거되고,
호스트 루트 기준 URL로 해석될 수 있습니다.

잘못된 예:

```text
http://127.0.0.1:8080/users/me/profile
```

정상 예:

```text
http://127.0.0.1:8080/api/v1/users/me/profile
```

---

## 13. Integration Flow의 비동기 처리 주의사항

실제 친구 요청 수락 후에는 단순히 버튼 클릭 직후 다음 화면으로 이동하지 않습니다.

권장 흐름:

```text
수락 클릭
→ 알림 항목이 사라질 때까지 대기
→ 상대 사용자 친구 목록 페이지 새로 이동
→ 친구 목록 API 재조회
→ 실제 표시 확인
```

예:

```ts
await requestItem
    .getByRole("button", {
        name: "수락",
        exact: true,
    })
    .click();

await expect(
    dialog.getByText(requesterPublicId),
).toBeHidden({
    timeout: 20_000,
});

await A.page.goto("/friends");

await expect(
    A.page.getByText(targetPublicId),
).toBeVisible({
    timeout: 20_000,
});
```

`toBeVisible({ timeout: 20_000 })`은 기존 데이터의 API를 자동으로 다시 호출하는 기능이 아닙니다.

이미 이전 API 응답으로 렌더링된 페이지라면 페이지를 다시 이동하거나,
애플리케이션의 refetch 동작이 필요합니다.

---

## 14. 테스트 실행 결과 디렉터리

Playwright 실행 후 일반적으로 다음 디렉터리가 생성됩니다.

```text
playwright-report/
test-results/
```

### `playwright-report/`

HTML Reporter 결과입니다.

포함되는 내용:

- 테스트 실행 결과
- 성공/실패 상태
- 실패 상세
- 관련 artifact 연결 정보

삭제해도 테스트 코드나 애플리케이션에는 영향이 없습니다.

필요할 때 테스트를 다시 실행하면 새 report가 생성됩니다.

### `test-results/`

테스트 실행 artifact 디렉터리입니다.

포함될 수 있는 내용:

- screenshot
- video
- trace.zip
- error-context.md
- 기타 테스트별 output artifact

삭제해도 테스트 코드나 애플리케이션에는 영향이 없습니다.

다만 실패 원인을 분석하기 전에 삭제하면 screenshot, video, trace 등의 디버깅 자료를 잃게 됩니다.

### 삭제 권장 시점

다음 상황에서는 삭제해도 됩니다.

- 모든 테스트가 통과했고 이전 결과가 필요 없음
- 실패 분석이 완료됨
- 오래된 실행 결과를 정리하고 싶음

PowerShell:

```powershell
Remove-Item playwright-report -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item test-results -Recurse -Force -ErrorAction SilentlyContinue
```

Git 관리 대상에서는 일반적으로 다음 디렉터리를 ignore 처리합니다.

```gitignore
/playwright-report/
/test-results/
```

CI에서는 필요에 따라 실패 시 artifact로 업로드한 후 보존 기간을 설정하는 방식을 권장합니다.

---

## 15. `.next` 디렉터리 주의

`.next` 역시 생성 결과물이므로 삭제할 수 있지만,
현재 환경에서는 Webpack cold build 시간이 길게 소요될 수 있습니다.

따라서 다음 상황이 아니라면 E2E 실행 직전에 습관적으로 삭제하지 않는 것을 권장합니다.

- 빌드 캐시 오염이 강하게 의심됨
- Next.js 설정 변경 후 이상 동작
- Turbopack/Webpack 캐시 문제 진단
- clean build 검증

삭제:

```powershell
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
```

주의:

Next.js 프로세스가 실행 중인 상태에서는 `.next`를 삭제하지 않습니다.

먼저 관련 Next/Node 프로세스를 종료한 뒤 삭제합니다.

---

## 16. 권장 테스트 실행 순서

### 일반 개발 중 빠른 검증

```powershell
npm run test:e2e
```

목표:

```text
54 passed
```

### Phase 완료 전 검증

1. FE build 확인

```powershell
npx next build --webpack
```

2. FE server 실행

```powershell
npm run start -- --hostname localhost --port 3000
```

3. Mock E2E

```powershell
npm run test:e2e
```

4. Real Integration

```powershell
npm run test:e2e:integration
```

5. 실패 시 report 확인

```powershell
npx playwright show-report
```

6. 필요 시 trace 확인

```powershell
npx playwright show-trace <trace.zip 경로>
```

---

## 17. 최종 완료 체크리스트

Phase 1 + Phase 1.5 E2E 완료 확인 시 다음을 확인합니다.

- [ ] FE production build 성공
- [ ] Mock E2E 54/54 통과
- [ ] A/B/C 인증 상태 유효
- [ ] BE 서버 정상 실행
- [ ] A → B 친구 요청 성공
- [ ] B → A 요청 수락 성공
- [ ] A/B 친구 목록 반영 확인
- [ ] FRIEND DIRECT 생성/조회 성공
- [ ] 실제 사용자 간 DIRECT 메시지 수신 확인
- [ ] A ↔ C 친구 관계 생성 성공
- [ ] B/C FRIEND GROUP 생성 성공
- [ ] B/C 그룹 메시지 실제 수신 확인
- [ ] 친구 차단 후 친구 목록 제외 확인
- [ ] 테스트 종료 후 관계 cleanup 확인
- [ ] 실패 artifact 분석 완료 또는 불필요 artifact 삭제

---

## 18. 빠른 명령 모음

### Mock E2E

```powershell
npm run test:e2e
```

### Real Integration E2E

```powershell
npm run test:e2e:integration
```

### 인증 상태 생성

```powershell
npm run e2e:auth
```

### HTML Report

```powershell
npx playwright show-report
```

### Webpack production build

```powershell
npx next build --webpack
```

### Production server

```powershell
npm run start -- --hostname localhost --port 3000
```

### 결과 디렉터리 정리

```powershell
Remove-Item playwright-report -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item test-results -Recurse -Force -ErrorAction SilentlyContinue
```

---

## 19. 현재 프로젝트 운영 권장 정책

현재 TranslaCat Chat Phase 1 + 1.5 기준 권장 방식:

```text
기능 구현
→ build 확인
→ Mock E2E 전체 실행
→ 실패 시 report/trace 분석
→ Mock 54/54 확인
→ Real Integration 실행
→ 실제 A/B/C Social + Chat 흐름 확인
→ 필요 시 test state cleanup
→ issue 완료 조건 체크
```

Mock E2E는 기능 회귀를 빠르게 검증하는 용도이고,
Real Integration은 실제 인증/BE/DB/WebSocket까지 연결된 최종 흐름을 검증하는 용도로 분리하여 운영합니다.

두 테스트의 목적이 다르므로 Mock 54개가 통과하더라도,
Phase 완료 전에는 Real Integration Flow도 별도로 확인하는 것을 권장합니다.
