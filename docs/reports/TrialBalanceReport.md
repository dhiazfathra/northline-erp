# Neraca Percobaan (`TrialBalanceReport`)

Group: Buku Besar. Reverse-engineered from Accurate Online v1.0.1#4970 in the sandbox Data Usaha, 2026-10-18.
Fixture and expected output: [`fixtures/trial-balance.json`](fixtures/trial-balance.json).

## Parameters

| Name | Type | Default | Meaning |
|---|---|---|---|
| `startDate` | date `dd/MM/yyyy` | 1st of current month | Period start (inclusive) |
| `endDate` | date `dd/MM/yyyy` | today | Period end (inclusive) |
| `showZeroBalance` | boolean | `false` | "Tampilkan data dengan Saldo Nol" |
| `showParentAccount` | boolean | `true` | "Tampilkan Akun Induk" |

Request: `POST {reportHost}/accurate/report/bg-execute-report.do` with
`planId=TrialBalanceReport&reportInput={"param":{...},"filter":[],"subSelection":0,"selection":[]}`, then poll
`/accurate/company/bg-proc-response.do` until `FINISHED`, then `GET /accurate/report/report-output-html.do?cacheId=…&pageIndex=…`.

## Layout

Header: company name, "Neraca Percobaan", "Dari dd Mmm yyyy s/d dd Mmm yyyy" (Indonesian month abbreviations: Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des).

| Column | Rule |
|---|---|
| Kode | account `no` |
| Nama | account `name` |
| Saldo Awal (Debit) / (Kredit) | net opening balance, on one side |
| Perubahan Debit | **gross** sum of debit lines in `[startDate, endDate]` |
| Perubahan Kredit | **gross** sum of credit lines in `[startDate, endDate]` |
| Saldo Akhir (Debit) / (Kredit) | net closing balance, on one side |

No grand-total row. Footer per page: "ACCURATE Accounting System Report", print timestamp, "Halaman n dari m".

## Calculation rules (verified against fixture)

1. **Net, one side.** For opening and closing, `net = Σdebit − Σcredit`. `net > 0` → Debit column, `net < 0` → Kredit column
   (as `|net|`), other column `0`. This ignores the account's normal side: a cash account overdrawn by 1.250.000,5
   shows `0 | 1.250.000,5` (fixture `feb31`, NL-T1-1101).
2. **Movement is gross.** Perubahan columns are not netted; several lines to the same account in one journal are summed
   (NL-T1-6001 in J6: 333.333,33 + 333.333,33 + 333.333,34 = 1.000.000).
3. **Opening for balance-sheet accounts** = net of all lines dated `< startDate`.
4. **Opening for P&L accounts** (REVENUE, COGS, EXPENSE, OTHER_INCOME, OTHER_EXPENSE) = net of lines dated
   `≥ fiscal-year start of startDate` and `< startDate`. Fiscal year starts 1 January in the sandbox. NL-T1-4001
   had 3.000.000 credit in Dec 2030 and opens Jan/Feb 2031 at 0; NL-T1-6001 opens Feb 2031 at 1.250.000,5 (January YTD).
5. **Year-end close into Laba Ditahan.** The retained-earnings account (company preference; `300002` in the sandbox)
   opens with its own lines plus the net of all P&L lines of every fiscal year that ended before `startDate`.
   Fixture: before 2031 it opens at 34.002.596 D; from 2031 it opens at 31.002.596 D (prior-year fixture income 3.000.000 Cr closed into it).
   There is no "current-year earnings" row.
6. **Closing** = opening + Perubahan Debit − Perubahan Kredit, presented per rule 1.
7. **Zero rows.** With `showZeroBalance=false` a row is hidden when opening net, period debit and period credit are all 0
   (NL-T1-1201 and NL-T1-4001 are absent in `jan31`). A row with movement whose closing nets to 0 is shown
   (sandbox 110303 Piutang USD 3.000.000/3.000.000).
8. **Parents.** With `showParentAccount=true`, parent rows show the sum of their children's opening net, gross debit,
   gross credit and closing net (2101 Perubahan Debit 4.520.000 = 2.520.000 + 2.000.000), placed before their children.
9. **Ordering.** Depth-first by account tree; siblings sorted by account `no` as a string (digits before letters:
   `7201` < `NL-T1-1101` < `ZZ-R01-1101`). Not grouped by account type.
10. **Number format.** `id-ID`: `.` thousands, `,` decimal; decimals only when non-zero and trailing zeros trimmed
    (`1.250.000,5`, `333.333,33`); zero printed as `0`. Amounts kept to 2 decimals; no rounding seen in fixture.

## Open questions

- Fiscal-year start other than January, and the retained-earnings account preference, untested.
- Rows with non-zero opening but no movement and zero closing (should show by rule 7) untested.
- Multi-currency accounts: base-currency amounts assumed.
