CREATE TABLE exchange_invoices (number text PRIMARY KEY, date date NOT NULL, collect_date date NOT NULL, due_date date NOT NULL, description text NOT NULL DEFAULT '');
CREATE TABLE exchange_invoice_lines (exchange_number text NOT NULL REFERENCES exchange_invoices (number), invoice_number text NOT NULL REFERENCES sales_invoices (number), PRIMARY KEY (exchange_number, invoice_number));
