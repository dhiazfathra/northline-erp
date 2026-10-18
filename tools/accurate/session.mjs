// usage: node session.mjs <steps.mjs>
// One sandbox login, then runs `export default async ({ app, call, runReport, log }) => ...` from a local steps file.
// Every helper asserts the sandbox before acting; output goes through `log` (scrubbed).
import { openSandbox, log } from './acc.mjs';
import { call } from './call.mjs';
import { runReport } from './report.mjs';
import { resolve } from 'node:path';
const { browser, app } = await openSandbox();
try { await (await import(resolve(process.argv[2]))).default({ app, call, runReport, log }); }
finally { await browser.close(); }
