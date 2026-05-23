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

- **`index.html`** — HTML/CSS/JS 통합 파일. `<script type="module">`로 Supabase JS SDK(esm.sh CDN)를 로딩. 상태는 Supabase PostgreSQL DB에 저장. `localStorage` 미사용.
- **`shopping-list.test.js`** — Playwright Chromium으로 `index.html`을 `file://` URL로 열어 E2E 테스트 수행. 테스트 프레임워크 없이 직접 작성된 커스텀 러너. 각 테스트마다 `screenshots/` 폴더에 PNG 스크린샷 저장.

테스트는 순차 실행되며 상태를 공유한다. `clearDatabase(page)`로 Supabase REST API를 통해 DB를 초기화한 뒤 시나리오를 진행하는 방식.

## Supabase 설정

| 항목 | 값 |
|------|----|
| Project | SoonMyeong's Project |
| Region | ap-northeast-2 (서울) |
| URL | `https://ycwbzlexgmlhsdqtrfwg.supabase.co` |
| 테이블 | `shopping_items` |
| RLS | 활성화 (anon 전체 허용) |

### 테이블 스키마: `shopping_items`

| 컬럼 | 타입 | 기본값 |
|------|------|--------|
| `id` | `uuid` | `gen_random_uuid()` |
| `name` | `text` | — |
| `checked` | `boolean` | `false` |
| `created_at` | `timestamptz` | `now()` |

## 주의사항

- `index.html`을 브라우저에서 `file://`로 직접 열면 esm.sh CDN 로딩 시 CORS 오류가 발생할 수 있음. 수동 확인 시 로컬 HTTP 서버 사용 권장.
- Playwright 테스트는 자체 Chromium으로 실행되므로 CORS 문제 없음.
