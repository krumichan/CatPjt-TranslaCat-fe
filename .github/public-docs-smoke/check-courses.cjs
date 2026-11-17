const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const [origin, fixture, report, modulePath, executable, mode = 'full'] = process.argv.slice(2);
const { chromium } = require(modulePath === '-' ? 'playwright' : modulePath);
const data = JSON.parse(fs.readFileSync(fixture, 'utf8'));
const products = { translacat: 10, unity: 8, unreal: 8 };
const samples = new Set([
  'translacat-mobile-code-pkce-exchange:ko',
  'unity-raid-papulatus:ja',
  'unreal-town-geometry-acknowledgement:en',
]);
const result = { mode, covers: 0, chapters: 0, earlier: 0, lessons: 0, images: 0, exports: [], errors: [] };
const pngMagic = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** 요청한 실습·코드 흐름이 메뉴에서 선택된 뒤 페이지가 완전히 그려졌는지 확인한다. */
async function openRoute(page, address, href) {
  await page.goto(address + href, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.locator('nav a[aria-current="page"][href="' + href + '"]').waitFor();
  assert.equal(new URL(page.url()).hash, href);
}

/** 흐름도 수와 이미지 렌더링을 대조하고, 대표 PNG를 실제 다운로드한다. */
async function verifyCharts(page, diagrams, key, download) {
  const charts = page.locator('main .diagram');
  if (diagrams !== null) assert.equal(await charts.count(), diagrams, key);
  await page.waitForFunction(() => [...document.querySelectorAll('main .diagram')]
    .every(chart => ['done', 'failed'].includes(chart.dataset.renderState)), { timeout: 18000 });
  assert.equal(await charts.filter({ has: page.locator('img') }).count(), await charts.count(), key);
  assert.equal(await page.locator('main .diagram[data-render-state="failed"]').count(), 0, key);
  assert(await charts.locator('img').evaluateAll(images =>
    images.every(image => image.complete && image.naturalWidth > 200 && image.naturalHeight > 64)), key);
  result.images += await charts.count();
  if (download) {
    const [file] = await Promise.all([page.waitForEvent('download'), charts.last().locator('a[download]').click()]);
    const bytes = fs.readFileSync(await file.path());
    assert(bytes.subarray(0, 8).equals(pngMagic), key);
    result.exports.push({ key, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  }
}

/** 프로젝트별 개발 가이드 목차와 각 장의 실습·이전·다음 링크를 확인한다. */
async function checkGuides(page, address, locale) {
  for (const [project, count] of Object.entries(products)) {
    const root = '#' + project + '/technology/';
    const chapters = data.guides.filter(row => row.locale === locale && row.project === project)
      .sort((a, b) => a.level - b.level);
    assert.equal(chapters.length, count);
    await openRoute(page, address, root + chapters[0].cover);
    const actual = await page.locator('main table tbody tr').evaluateAll(rows =>
      rows.map(row => [...row.querySelectorAll('a')].map(anchor => anchor.getAttribute('href'))));
    assert.deepEqual(actual, chapters.map(row => [root + row.id, root + row.id + '/flow/practice']));
    result.covers++;

    for (const [index, row] of chapters.entries()) {
      if (mode === 'smoke' && index !== 0 && index !== count - 1) continue;
      const href = root + row.id;
      await openRoute(page, address, href + '/flow/practice');
      await page.getByRole('heading', { level: 3, name: row.practiceTitle, exact: true }).waitFor();
      if (index > 0) assert(await page.locator('main a[href="' + root + chapters[index - 1].id + '"]').count(), href);
      if (index + 1 < count) assert(await page.locator('main a[href="' + root + chapters[index + 1].id + '"]').count(), href);
      await verifyCharts(page, row.diagrams, href, false);
      result.chapters++;
    }
  }
}

/** 앞선 심화 강의와 새 강의를 공개 경로로 열어 소스 인용·실습 이동을 확인한다. */
async function checkLessons(page, address, locale, key) {
  const first = new Set();
  const books = new Set();
  for (const row of data[key].filter(row => row.locale === locale)) {
    const label = row.id + ':' + locale;
    const download = key === 'lessons' && samples.has(label);
    if (mode === 'smoke' && first.has(row.project) && !download) continue;
    first.add(row.project);
    const parent = '#' + row.project + '/technology/' + row.bookId;
    if (!books.has(parent)) {
      await openRoute(page, address, parent);
      const targets = data[key].filter(entry => entry.locale === locale && entry.bookId === row.bookId);
      for (const target of targets) {
        assert(await page.locator('main a[href="' + target.href + '/flow/practice"]').count(), target.href);
      }
      books.add(parent);
    }
    await openRoute(page, address, row.href + '/flow/' + row.flow);
    await page.getByRole('heading', { level: 1, name: row.title, exact: true }).waitFor();
    if (row.sources !== null) assert.equal(await page.locator('main pre code').count(), row.sources, row.href);
    await verifyCharts(page, row.charts, row.href, download);
    await page.locator('nav a[href="' + row.href + '/flow/practice"]').click();
    await page.locator('nav a[aria-current="page"][href="' + row.href + '/flow/practice"]').waitFor();
    result[key]++;
  }
}

/** 두 실행 모드에서 같은 원고 목록을 사용해 CI와 운영 결과를 남긴다. */
async function run() {
  const browser = await chromium.launch({ executablePath: executable === '-' ? undefined : executable,
    headless: true, args: ['--no-sandbox'] });
  try {
    for (const locale of ['ko', 'ja', 'en']) {
      const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 1050 } });
      page.setDefaultTimeout(18000);
      page.on('pageerror', error => result.errors.push(error.message));
      page.on('response', response => {
        if (response.status() >= 400 && new URL(response.url()).pathname.startsWith('/design-docs-assets/')) {
          result.errors.push(response.status() + ' ' + response.url());
        }
      });
      const target = new URL('/docs', origin);
      target.searchParams.set('lang', locale);
      if (mode === 'smoke') target.searchParams.set('release_check', 'technology-20261117');
      await checkGuides(page, target.href, locale);
      await checkLessons(page, target.href, locale, 'earlier');
      await checkLessons(page, target.href, locale, 'lessons');
      console.log(JSON.stringify({ locale, covers: result.covers, chapters: result.chapters,
        earlier: result.earlier, lessons: result.lessons, images: result.images }));
      await page.close();
    }
    assert.equal(result.covers, 9);
    assert.equal(result.chapters, mode === 'full' ? 78 : 18);
    assert.equal(result.earlier, mode === 'full' ? 81 : 9);
    if (mode === 'full') assert.equal(result.lessons, 132);
    else assert(result.lessons >= 9);
    assert.equal(result.exports.length, samples.size);
    assert.deepEqual(result.errors, []);
  } finally {
    await browser.close();
  }
}

run().catch(error => { result.errors.push(String(error.stack ?? error)); }).finally(() => {
  fs.mkdirSync(path.dirname(report), { recursive: true });
  fs.writeFileSync(report, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
  process.exitCode = Number(result.errors.length > 0);
});
