# Laba/Rugi (Standar) (`ProfitLossStandardReport`)

Group: Keuangan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18.
Fixture: [`fixtures/financial-statements.json`](fixtures/financial-statements.json) (`profitLoss`), journals from
[`fixtures/trial-balance.json`](fixtures/trial-balance.json). 2030–2031 contain only fixture journals, so the whole
statement is diffed. ERP: `apps/api/src/reports/financial-statements.ts` → `profitLoss()`; test: `apps/api/test/trial-balance.test.ts`.

## Parameters

`startDate`, `endDate` (`dd/MM/yyyy`); `selectedBranch` = array of `{name,id}` (`[{"name":"[Semua Cabang]","id":null}]` = all);
`selectedCurrency` = array of currency objects; booleans `showTotal=false`, `showParentAccount=true`, `showChildAccount=true`,
`showZeroBalance=false`, `showParentAccountBalance=true`. Plain strings for branch/currency make the output endpoint fail
(`Error report-output-html : java.lang.RuntimeException`).

## Layout

Header: company, title, "Dari … s/d …", "Cabang : …, Mata Uang : …". Columns: `Deskripsi` | period label
(`1 - 28 Feb 2031`, `1 Jan - 28 Feb 2031`, `1 Des 2030 - 31 Jan 2031`). Accounts print by **name only**.

| Line | Value |
|---|---|
| PENDAPATAN … Jumlah Pendapatan | REVENUE accounts, C − D |
| BEBAN POKOK PENJUALAN … Jumlah Beban Pokok Penjualan | COGS, D − C |
| LABA KOTOR | Pendapatan − BPP |
| BEBAN OPERASIONAL … Jumlah Beban Operasional | EXPENSE, D − C |
| PENDAPATAN OPERASIONAL | Laba kotor − beban operasional |
| PENDAPATAN DAN BEBAN NON OPERASIONAL | heading |
| Pendapatan Non Operasional … Jumlah | OTHER_INCOME, C − D |
| Beban Non Operasional … Jumlah | OTHER_EXPENSE, D − C |
| Jumlah Pendapatan dan Beban Non Operasional | OI − OE |
| LABA BERSIH | Pendapatan operasional + non operasional |

## Rules

1. Amount = net movement in `[startDate, endDate]` on the account's natural side; contra entries show negative
   (sandbox "Retur Penjualan" under PENDAPATAN prints `-400.000`).
2. **No fiscal-year reset inside the range**: Dec 2030–Jan 2031 sums both years (fixture `span`: 3.000.000 revenue).
3. Section headings and `Jumlah` lines always print, `0` when empty; accounts with 0 hide when `showZeroBalance=false`.
4. Section totals sum leaf accounts only; a parent prints its subtree sum before its children.
5. Number format as in [TrialBalanceReport.md](TrialBalanceReport.md) rule 10.

Unverified: `showTotal`, `showChildAccount=false`, branch filter, foreign currency.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop), NL-TP journals J1-J4 of 2045. Fixture
[fixtures/trade/journal-tp.json](fixtures/trade/journal-tp.json), test `apps/api/test/trade-portal.test.ts`: zero diff.
Rules above unchanged. Only the inputs differ: flat numeric account numbers (`1101` > `110102`), and
branch/currency parameters must be sent as `[]` (`[Semua Cabang]` or omitting them returns a 500). See ADR-0029.
