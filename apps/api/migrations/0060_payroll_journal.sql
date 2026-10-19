-- Pencatatan Gaji journal (P4.2 batch 2, docs/parity/buku-besar/pencatatan-gaji): a run booked with accounts posts
-- Dr each fee's expense account / Cr PPh 21 payable / Cr salary payable, EPY.yyyy.mm.nnnnn. P3.6 runs (no accounts) keep no journal.
ALTER TABLE payroll_runs ADD COLUMN description text NOT NULL DEFAULT '', ADD COLUMN journal_id text;
