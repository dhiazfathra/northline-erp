-- Penyetuju Transaksi (ADR-0028): approval rules per transaction type and the approval state of each document.
CREATE TABLE approval_rules (
  id               serial PRIMARY KEY,
  -- Accurate offers SI, SQ, DO, SO in Retail Demo
  transaction_type text NOT NULL CHECK (transaction_type IN ('SI', 'SQ', 'DO', 'SO')),
  min_amount       bigint NOT NULL DEFAULT 0,
  approvers        text[] NOT NULL CHECK (cardinality(approvers) > 0),
  mode             text NOT NULL DEFAULT 'ONEOFUSER' CHECK (mode IN ('ONEOFUSER', 'TWOOFUSER', 'ALLUSER', 'ALLUSERRANDOM'))
);

CREATE TABLE document_approvals (
  transaction_type text NOT NULL,
  number           text NOT NULL,
  date             date NOT NULL,
  requested_by     text NOT NULL,
  status           text NOT NULL CHECK (status IN ('UNAPPROVED', 'APPROVED', 'REJECTED')),
  PRIMARY KEY (transaction_type, number)
);

CREATE TABLE approval_steps (
  transaction_type text NOT NULL,
  number           text NOT NULL,
  approver         text NOT NULL,
  status           text NOT NULL DEFAULT 'UNAPPROVED' CHECK (status IN ('UNAPPROVED', 'APPROVED', 'REJECTED')),
  decided_on       date,
  reason           text NOT NULL DEFAULT '',
  PRIMARY KEY (transaction_type, number, approver),
  FOREIGN KEY (transaction_type, number) REFERENCES document_approvals (transaction_type, number)
);
