# Playwright E2E 테스트

## 목적

TranslaCat FE Phase 1.5에서는 Playwright를 사용하여 주요 사용자 흐름을 E2E 테스트로 검증한다.

## 설치

```powershell
npm install -D @playwright/test
npx playwright install chromium
```

## npm scripts

`package.json`에 아래 scripts를 추가한다.

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:report": "playwright show-report"
  }
}
```

PowerShell에서는 아래 명령으로 추가할 수 있다.

```powershell
npm pkg set scripts.test:e2e="playwright test"
npm pkg set scripts.test:e2e:ui="playwright test --ui"
npm pkg set scripts.test:e2e:headed="playwright test --headed"
npm pkg set scripts.test:e2e:report="playwright show-report"
```

## 실행

```powershell
npm run test:e2e
```

브라우저를 직접 보면서 실행하려면 아래 명령을 사용한다.

```powershell
npm run test:e2e:headed
```

UI 모드로 테스트를 실행하려면 아래 명령을 사용한다.

```powershell
npm run test:e2e:ui
```

## 기존 서버를 대상으로 실행

이미 `npm run dev`를 실행 중인 상태에서 Playwright만 실행하려면 아래처럼 실행한다.

```powershell
$env:PLAYWRIGHT_SKIP_WEB_SERVER="1"
$env:E2E_BASE_URL="http://127.0.0.1:3000"
npm run test:e2e
```

## Phase 1.5 운영 기준

각 FE 기능 이슈는 가능한 범위에서 아래 순서로 완료한다.

1. 기능 구현
2. i18n 문구 추가 및 확인
3. Loading / Empty / Error 상태 확인
4. `npm run build` 성공 확인
5. 관련 Playwright 테스트 추가 또는 실행
6. 이슈 완료 처리


## 실제 BE/FE 결합 테스트

Mock이 아닌 실제 서버를 대상으로 하는 테스트는 `integration-chromium` 프로젝트로 분리한다.

```powershell
Copy-Item .env.e2e.example .env.e2e.local
npm run e2e:auth
npm run test:e2e:integration
```

OPEN 채팅 결합 흐름만 실행하려면 다음 명령을 사용한다.

```powershell
npm run test:e2e:integration:open
```

상세한 준비 절차와 Docs #12 체크 기준은 `docs/test/phase2-open-chat-integration-qa.md`를 참고한다.
