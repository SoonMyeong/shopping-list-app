# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# 의존성 설치
npm install

# Playwright 브라우저 설치 (최초 1회)
npx playwright install chromium

# E2E 테스트 실행
node shopping-list.test.js
```

## Architecture

단일 파일 웹 앱 + 독립 테스트 스크립트 구조.

- **`index.html`** — HTML/CSS/JS 통합 파일. 별도 빌드 없이 브라우저에서 직접 열거나 `file://` URL로 접근. 상태는 `localStorage`에 `shopping-list` 키로 저장.
- **`shopping-list.test.js`** — Playwright Chromium으로 `index.html`을 `file://` URL로 열어 E2E 테스트 수행. 테스트 프레임워크 없이 직접 작성된 커스텀 러너. 각 테스트마다 `screenshots/` 폴더에 PNG 스크린샷 저장.

테스트는 순차 실행되며 상태를 공유한다. `clearStorage()`로 localStorage를 초기화한 뒤 시나리오를 진행하는 방식.
