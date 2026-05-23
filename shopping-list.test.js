const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FILE_URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
const SS_DIR = path.join(__dirname, 'screenshots');

const SUPABASE_URL = 'https://ycwbzlexgmlhsdqtrfwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd2J6bGV4Z21saHNkcXRyZndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjU4NzIsImV4cCI6MjA5NTA0MTg3Mn0.ar1-9qeiO_tsZW0e1vxt3-0Y8pUiZn3OancrGK_6Ai8';

let browser, page;
const results = [];
let ssIndex = 0;

function ensureDir() {
  if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR);
}

async function shot(label) {
  ssIndex++;
  const filename = `${String(ssIndex).padStart(2, '0')}_${label}.png`;
  await page.screenshot({ path: path.join(SS_DIR, filename), fullPage: false });
  return filename;
}

function log(status, testName, detail = '', filename = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  const msg = `${icon} ${testName}${detail ? ' — ' + detail : ''}${filename ? ' [' + filename + ']' : ''}`;
  results.push({ status, testName, detail, filename });
  console.log(msg);
}

async function clearDatabase(page) {
  // PostgREST 올바른 구문: id=not.is.null (모든 행 매칭)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shopping_items?id=not.is.null`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`clearDatabase 오류 ${res.status}:`, text);
  }
  await page.reload();
  await page.waitForSelector('.empty-msg, .item', { timeout: 10000 });
}

async function addItem(name) {
  await page.fill('#new-item', name);
  await page.click('.add-btn');
  await page.waitForSelector('.item-name', { timeout: 10000 });
}

async function runTests() {
  ensureDir();
  browser = await chromium.launch({ headless: false, slowMo: 400 });
  page = await browser.newPage();
  await page.setViewportSize({ width: 600, height: 700 });
  await page.goto(FILE_URL);
  await page.waitForSelector('.empty-msg, .item', { timeout: 10000 });

  // ── 1. 초기 상태: 빈 메시지 표시 ─────────────────────────
  await clearDatabase(page);
  const emptyMsg = await page.locator('.empty-msg').isVisible();
  const f1 = await shot('01_초기상태_빈메시지');
  emptyMsg
    ? log('PASS', '초기 상태', '빈 리스트 메시지 표시됨', f1)
    : log('FAIL', '초기 상태', '빈 리스트 메시지가 보이지 않음', f1);

  // ── 2. 아이템 추가 (버튼 클릭) ───────────────────────────
  await addItem('사과');
  const item1 = await page.locator('.item-name', { hasText: '사과' }).isVisible();
  const f2 = await shot('02_아이템추가_버튼');
  item1
    ? log('PASS', '아이템 추가 (버튼)', '', f2)
    : log('FAIL', '아이템 추가 (버튼)', '"사과" 아이템이 보이지 않음', f2);

  // ── 3. 아이템 추가 (Enter 키) ─────────────────────────────
  await page.fill('#new-item', '바나나');
  await page.press('#new-item', 'Enter');
  await page.locator('.item-name').filter({ hasText: '바나나' }).waitFor({ timeout: 10000 });
  const item2 = await page.locator('.item-name', { hasText: '바나나' }).isVisible();
  const f3 = await shot('03_아이템추가_Enter');
  item2
    ? log('PASS', '아이템 추가 (Enter 키)', '', f3)
    : log('FAIL', '아이템 추가 (Enter 키)', '"바나나" 아이템이 보이지 않음', f3);

  // ── 4. 빈 입력 무시 ───────────────────────────────────────
  const countBefore = await page.locator('.item').count();
  await page.fill('#new-item', '   ');
  await page.click('.add-btn');
  // 빈 입력은 DB 호출 없이 즉시 무시됨 — 짧게 대기
  await page.waitForTimeout(500);
  const countAfter = await page.locator('.item').count();
  const f4 = await shot('04_빈입력무시');
  countBefore === countAfter
    ? log('PASS', '빈 입력 무시', '공백 입력 시 아이템 추가 안됨', f4)
    : log('FAIL', '빈 입력 무시', '공백 입력 시 아이템이 추가됨', f4);

  // ── 5. 체크박스 체크 (완료 처리) ─────────────────────────
  const checkbox = page.locator('.item').filter({ hasText: '사과' }).locator('input[type="checkbox"]');
  await checkbox.click();
  await page.waitForSelector('.item.checked', { timeout: 10000 });
  const isChecked = await checkbox.isChecked();
  const hasStrike = await page.locator('.item.checked .item-name', { hasText: '사과' }).isVisible();
  const f5 = await shot('05_체크박스_체크');
  isChecked && hasStrike
    ? log('PASS', '체크박스 체크', '취소선 스타일 적용됨', f5)
    : log('FAIL', '체크박스 체크', `checked=${isChecked}, strikethrough=${hasStrike}`, f5);

  // ── 6. 완료 항목 지우기 버튼 표시 ────────────────────────
  const clearBtnVisible = await page.locator('.clear-btn.visible').isVisible();
  const f6 = await shot('06_완료버튼_표시');
  clearBtnVisible
    ? log('PASS', '완료 항목 지우기 버튼 표시', '', f6)
    : log('FAIL', '완료 항목 지우기 버튼 표시', '버튼이 보이지 않음', f6);

  // ── 7. 체크박스 언체크 ────────────────────────────────────
  await checkbox.click();
  await page.waitForFunction(() => !document.querySelector('.item.checked'), { timeout: 10000 });
  const isUnchecked = !(await checkbox.isChecked());
  const noStrike = !(await page.locator('.item.checked .item-name', { hasText: '사과' }).isVisible());
  const f7 = await shot('07_체크박스_언체크');
  isUnchecked && noStrike
    ? log('PASS', '체크박스 언체크', '취소선 제거됨', f7)
    : log('FAIL', '체크박스 언체크', `unchecked=${isUnchecked}, strikeRemoved=${noStrike}`, f7);

  // ── 8. 완료 항목 지우기 버튼 숨김 ────────────────────────
  const clearBtnHidden = !(await page.locator('.clear-btn.visible').isVisible());
  const f8 = await shot('08_완료버튼_숨김');
  clearBtnHidden
    ? log('PASS', '완료 항목 지우기 버튼 숨김', '', f8)
    : log('FAIL', '완료 항목 지우기 버튼 숨김', '버튼이 여전히 보임', f8);

  // ── 9. 아이템 삭제 ────────────────────────────────────────
  const deleteBtn = page.locator('.item').filter({ hasText: '사과' }).locator('.delete-btn');
  await deleteBtn.click();
  await page.waitForFunction(
    () => !Array.from(document.querySelectorAll('.item-name')).some(el => el.textContent.includes('사과')),
    { timeout: 10000 }
  );
  const appleGone = !(await page.locator('.item-name', { hasText: '사과' }).isVisible());
  const f9 = await shot('09_아이템삭제');
  appleGone
    ? log('PASS', '아이템 삭제', '"사과" 삭제됨', f9)
    : log('FAIL', '아이템 삭제', '"사과"가 여전히 보임', f9);

  // ── 10. 완료 항목 지우기 기능 ─────────────────────────────
  await addItem('딸기');
  await addItem('포도');
  await page.locator('.item').filter({ hasText: '딸기' }).locator('input[type="checkbox"]').click();
  await page.waitForSelector('.item.checked', { timeout: 10000 });
  await page.locator('.item').filter({ hasText: '포도' }).locator('input[type="checkbox"]').click();
  await page.waitForFunction(
    () => document.querySelectorAll('.item.checked').length === 2,
    { timeout: 10000 }
  );
  const f10a = await shot('10a_완료항목지우기_전');
  await page.locator('.clear-btn').click();
  await page.waitForFunction(
    () => !Array.from(document.querySelectorAll('.item-name')).some(el => el.textContent.includes('딸기')),
    { timeout: 10000 }
  );
  const strawberryGone = !(await page.locator('.item-name', { hasText: '딸기' }).isVisible());
  const grapeGone = !(await page.locator('.item-name', { hasText: '포도' }).isVisible());
  const bananaLeft = await page.locator('.item-name', { hasText: '바나나' }).isVisible();
  const f10b = await shot('10b_완료항목지우기_후');
  strawberryGone && grapeGone && bananaLeft
    ? log('PASS', '완료 항목 지우기', '완료 항목 삭제, 미완료 항목 유지됨', `${f10a} → ${f10b}`)
    : log('FAIL', '완료 항목 지우기', `딸기삭제=${strawberryGone}, 포도삭제=${grapeGone}, 바나나유지=${bananaLeft}`, f10b);

  // ── 11. Supabase 영속성 ─────────────────────────────────
  await addItem('망고');
  await page.locator('.item-name').filter({ hasText: '망고' }).waitFor({ timeout: 10000 });
  const f11a = await shot('11a_새로고침_전');
  await page.reload();
  await page.waitForSelector('.empty-msg, .item', { timeout: 10000 });
  const mangoVisible = await page.locator('.item-name').filter({ hasText: '망고' }).isVisible();
  const f11b = await shot('11b_새로고침_후');
  mangoVisible
    ? log('PASS', 'Supabase 영속성', '새로고침 후에도 데이터 유지됨', `${f11a} → ${f11b}`)
    : log('FAIL', 'Supabase 영속성', '새로고침 후 데이터 사라짐', f11b);

  // ── 결과 요약 ─────────────────────────────────────────────
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log('\n─────────────────────────────────');
  console.log(`결과: ${passed}개 통과 / ${failed}개 실패 / 총 ${results.length}개`);
  if (failed === 0) console.log('모든 테스트를 통과했습니다! 🎉');
  else console.log('일부 테스트가 실패했습니다.');
  console.log(`스크린샷 저장 위치: ${SS_DIR}`);

  await browser.close();
}

runTests().catch(err => {
  console.error('테스트 실행 오류:', err);
  if (browser) browser.close();
  process.exit(1);
});
