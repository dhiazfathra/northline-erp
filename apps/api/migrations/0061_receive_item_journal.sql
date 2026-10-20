-- Penerimaan Barang edit/delete (P4.2 batch 4, docs/parity/pembelian/penerimaan-barang): a priced receipt keeps its journal id
-- so a delete can take the journal back. Unpriced receipts (no journal) stay NULL.
ALTER TABLE receive_items ADD COLUMN journal_id text;
