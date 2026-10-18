-- SPT Masa PPN (docs/reports/SalesInvoiceSPTListReport.md): tax document code / transaction type default from the party,
-- and the SPT a taxed invoice was reported in. Only reported invoices appear in the SPT Masa lists.
ALTER TABLE customers ADD COLUMN tax_document_code text NOT NULL DEFAULT 'DIGUNGGUNG', ADD COLUMN tax_type text;
ALTER TABLE vendors ADD COLUMN tax_document_code text NOT NULL DEFAULT 'CTAS_INVOICE', ADD COLUMN tax_type text NOT NULL DEFAULT 'CTAS_KEPADA_SELAIN_PEMUNGUT_PPN';
CREATE TABLE spt_masa (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_date date NOT NULL,
  to_date   date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sales_invoices ADD COLUMN document_code text, ADD COLUMN tax_type text, ADD COLUMN spt_masa_id bigint REFERENCES spt_masa (id);
ALTER TABLE purchase_invoices ADD COLUMN document_code text, ADD COLUMN tax_type text, ADD COLUMN spt_masa_id bigint REFERENCES spt_masa (id);
