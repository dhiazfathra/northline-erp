/btw Why implementing activity logs took so long? I thought we can just utilize the cqrs event sourcing

# Answer

Event sourcing covers only a small part of it. Most of the time so far has gone into Accurate, not the ERP.

**Why the events table isn't enough:**
- Only Journal, Account and Period are event-sourced. Customers, items, sales invoices and every other document are plain tables with `audit_log` triggers (ADR-0005), so most log rows have no event behind them.
- Even the events don't match Accurate's log. A sales invoice posts a `JournalPosted` event, but Accurate shows one "Faktur Penjualan" row, not a "Jurnal Umum" row. Saving a customer writes two rows (Pelanggan and Kontak). Editing an asset (FAE) also writes an "Aset Tetap · Ubah" row. These mappings had to be found in the sandbox, not derived from events.
- Accurate keeps the reference and Tgl Transaksi as they were when each row was written. After a number change, older rows still show the old number. Projecting from current state would get that wrong.
- Events don't record the client IP today, and the user name and email have to come from the session.
- The ERP has no edit or delete for JV, sales invoice, customer, item or account. There is only `ReverseJournal` and `upsert*`. Without those commands there's nothing to log for "Ubah" and "Hapus", and the zero-diff loop needs all three.

**Where the time actually went:**
1. **Protecting personal data.** My first capture parser let the real user name, email and IP into local scratch output. Nothing was committed, and I deleted the files. Jasper splits cells across lines and page breaks, so I rebuilt capture around the xlsx export, scrubbed it by column, and added a check that blocks any stray email or IP. I also found 9 email-domain fragments (`indonesia.com`) in the capture that was already committed and pushed. I'll replace that file. Removing it from git history is your call.
2. **Rules nobody wrote down.** I measured these in the sandbox: rows sort by full log timestamp, newest first; failed saves aren't logged; there is one row per save; deletes show the number at deletion time; masters print their name; August prints as `Agt`. The midnight timezone check needed waiting until 00:00 WIB.
3. **Scripting Accurate.** Save and delete endpoints differ by form, and some forms needed debugging.

**What I'm reusing from event sourcing:** for Journal, Account and Period, log rows will be written from command metadata inside the same transaction as the events. Documents and master data call a `logActivity(tx, …)` helper in their own transactions. The ERP side is the smaller job. Most of the work left is building the missing edit and delete commands.
