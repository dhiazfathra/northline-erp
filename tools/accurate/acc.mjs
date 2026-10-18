import { readFileSync, existsSync } from 'node:fs';
import { chromium } from '../../node_modules/.pnpm/playwright@1.64.1/node_modules/playwright/index.mjs';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);
export const DB = env.SANDBOX_DB_NAME;
const SECRETS = [env.ACCURATE_USER, env.ACCURATE_PASS, env.SANDBOX_DB_NAME].filter(Boolean);
export const red = (s) => SECRETS.reduce((t, x) => t.split(x).join('[REDACTED]'), String(s));
export const log = (...a) => console.log(red(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')));

const DIR = new URL('.', import.meta.url).pathname;
const STATE = DIR + 'state.json';

export async function open({ headless = true } = {}) {
  const browser = await chromium.launch({ headless });
  const ctx = await browser.newContext(existsSync(STATE) ? { storageState: STATE } : {});
  const page = await ctx.newPage();
  return { browser, ctx, page, save: () => ctx.storageState({ path: STATE }) };
}

export async function login(page) {
  await page.goto('https://account.accurate.id/', { waitUntil: 'networkidle', timeout: 90000 });
  const u = page.locator('input#account:visible').first();
  if (await u.count()) {
    await u.fill(env.ACCURATE_USER);
    await page.locator('input[type=password]:visible').first().fill(env.ACCURATE_PASS);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
  }
}

// Abort unless the active Data Usaha (header span.first-name) is exactly the sandbox.
export async function assertSandbox(page) {
  const names = await page.$$eval('span.first-name', (els) => els.map((e) => e.textContent.trim())).catch(() => []);
  if (names.length === 0 || names.some((n) => n !== DB)) throw new Error('assertSandbox: active Data Usaha is not the sandbox; abort');
}

export async function openSandbox() {
  const o = await open();
  await login(o.page);
  await o.page.waitForTimeout(3000);
  const hits = o.page.getByText(DB, { exact: true });
  if ((await hits.count()) !== 1) throw new Error('openSandbox: sandbox not uniquely listed; abort');
  const [np] = await Promise.all([o.ctx.waitForEvent('page', { timeout: 20000 }).catch(() => null), hits.first().click()]);
  o.app = np ?? o.page;
  await o.app.waitForLoadState('networkidle');
  await o.app.waitForSelector('span.first-name', { timeout: 30000 });
  await assertSandbox(o.app);
  await o.save();
  return o;
}

// Scrub every uncaught error: Playwright call logs echo fill() values.
for (const ev of ['uncaughtException', 'unhandledRejection']) {
  process.on(ev, (e) => { console.error(red((e?.name ?? '') + ': ' + (e?.message ?? e)).split('\n')[0].replace(/fill\(.*\)/g, 'fill(<scrubbed>)')); process.exit(1); });
}
