# Accurate sandbox tooling

Playwright scripts that drive the Accurate sandbox Data Usaha for report reverse-engineering
(see `docs/reports/README.md`). Credentials and the sandbox name come only from the repo `.env`
(`ACCURATE_USER`, `ACCURATE_PASS`, `SANDBOX_DB_NAME`). `acc.mjs` scrubs them from all output,
including uncaught Playwright errors. `assertSandbox` aborts unless the header Data Usaha is exactly
the sandbox, and every helper calls it before acting.

| Script | Purpose |
|---|---|
| `report.mjs <planId> '<param json>' [out]` | `report-input` → `bg-execute-report` → poll `bg-proc-response` → `report-output-html?cacheId&reportView=report` on `acc.reportHost`; prints rows |
| `call.mjs <path.do> '<json>' [out]` | Raw POST to an app endpoint (`search-*`, `view-*`, `detail-lookup-*`, `delete-*`) |
| `capture-save.mjs <module> <id> <regex> <out>` | Opens a record, serializes it with the form's own `_getSubmitData`/`submitForm`, **aborts** the save request, writes the wire body to `<out>-raw.txt`. Never persists |
| `KIND=si|pi save-inv.mjs '<spec>'` | New sales or purchase invoice cloned from `si-wire.json` / `pi-wire.json` (decoded `_param` of a captured taxed invoice) |
| `save-item.mjs '<overrides>'` | New item cloned from `item-wire.json` (flat `param.*` keys) |

Wire formats: transaction forms post `_param=<nested JSON>`; detail rows need `_status: 'insert'`.
Master forms (items) post flat `param.<field>` keys. Warnings come back as `{c: <flag>}`: set the flag and resubmit.

PPN gotcha: the invoice `taxable`/`useTax1` flags are ignored unless the **item** has a default tax
(`tax1Id`, e.g. 100 = "ZZ-R01-PPN 11%"). Without it Accurate saves the invoice untaxed.

Captured payloads (`*.json`, `*.txt`) and `state.json` are gitignored: they hold sandbox data and session cookies.

`save-ri.mjs '<spec>'` saves a new Penerimaan Barang cloned from `ri.json` (captured with
`capture-save.mjs accurate__vendor__receive-item 200 save-receive-item ri.json`); saves go through `bg-save-receive-item.do`.

Purchase invoice expense lines (Biaya tab): pass `extra.detailExpense: [{_status:'insert', seq, accountId, expenseAmount, expenseName, expenseNotes:'', allocateToItemCost:false}]` to `save-inv.mjs`. Account ids come from `/accurate/general-ledger/search-glaccount.do`.

`save-param.mjs <path.do> '<flat param.* json>'` posts a new document without a captured template (used for Pencatatan Beban, `/accurate/general-ledger/save-expense-accrual.do`).

`item-flat.mjs <id> <out>` serializes the item form as flat keys. It returns the blank new-item form, which is the template for `item-wire.json`.
- **Stock items** created with `save-item.mjs` need explicit GL ids (copy them from `detail-item.do` of NL-T4-B1). Otherwise Accurate rejects the parent account.
- **Services** need an expense account in `cogsGlAccountId`/`inventoryGlAccountId`.
- **PPh:** `tax3Id` on a service did not persist (NL-T29-S2, id 401).

`session.mjs <steps.mjs>` logs in once and runs `export default async ({ app, call, runReport, log }) => ...` from a
steps file; `forms.mjs` holds the helpers those steps use (`formParams`/`formData` serialize a record's edit form,
`captureWire` returns the body its Simpan would send with the request aborted, `save` follows background saves and
warning flags, `asNew` turns a captured body into a new record).

`AuditListReport` (Daftar Log Aktifitas) prints the login, email and IP. `runReport` reads its xlsx export instead of the
HTML, merges records Jasper split across page breaks, restores wrapped reference/type text from `search-audit.do`, and
replaces Pengguna/Email/Alamat IP with `nl-tester`, `nl-tester@example.test`, `203.0.113.10` before returning; `raw`
is refused for this plan.
